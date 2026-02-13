import type { Collection, Db } from 'mongodb';

import { logger } from './logger';
import { U } from './collections';
import { getDbOrThrow } from './db';
import { checkRateLimit } from './rateLimit';

export type PushPayloadType = 'TO_ALERT' | 'COMMUNITY_REPLY' | 'SYSTEM';

export interface PushTokenDoc {
  device_id: string;
  user_id?: string;
  token: string;
  platform: string;
  device_name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PushDeliveryLog {
  ticket_id: string;
  token: string;
  user_id?: string;
  facility_id?: string;
  alert_type: PushPayloadType;
  status: 'sent' | 'ok' | 'error';
  error_message?: string;
  sent_at: Date;
  receipt_checked_at?: Date;
  receipt_check_attempts?: number;
  last_receipt_check_at?: Date;
  next_receipt_retry_at?: Date;
}

export interface PushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

type ExpoSendItem = {
  id: string;
  status: 'ok' | 'error';
  message?: string;
  details?: { error: string };
};

type ExpoSendResponse = {
  data?: ExpoSendItem[];
};

type ExpoReceiptItem = {
  status: 'ok' | 'error';
  message?: string;
  details?: { error: string };
};

type ExpoReceiptResponse = {
  data?: Record<string, ExpoReceiptItem>;
};

const PUSH_SEND_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const PUSH_RECEIPT_ENDPOINT = 'https://exp.host/--/api/v2/push/getReceipts';

const MAX_TOKENS_PER_REQUEST = 100;
const MAX_PUSHES_PER_USER_PER_HOUR = 10;
const PUSH_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_RECEIPT_RETRY_ATTEMPTS = 3;
const RECEIPT_TTL_MS = 24 * 60 * 60 * 1000;
const RECEIPT_RETRY_BASE_MS = 60_000;
const PUSH_RATE_LIMIT_PREFIX = 'push-user';

async function resolveDb(db?: Db): Promise<Db> {
  if (db) {
    return db;
  }

  return getDbOrThrow();
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function extractErrorMessage(message?: string, details?: { error: string }): string | undefined {
  if (message) {
    return message;
  }

  if (details?.error) {
    return details.error;
  }

  return undefined;
}

function isDeviceNotRegistered(message?: string, details?: { error: string }): boolean {
  return message === 'DeviceNotRegistered' || details?.error === 'DeviceNotRegistered';
}

function receiptRetryDelayMs(attempt: number) {
  return RECEIPT_RETRY_BASE_MS * 2 ** Math.max(0, attempt - 1);
}

function normalizeAlertType(type?: PushPayloadType): PushPayloadType {
  if (type === 'COMMUNITY_REPLY' || type === 'SYSTEM' || type === 'TO_ALERT') {
    return type;
  }

  return 'SYSTEM';
}

function toSnakeCaseLog(payload: {
  ticketId: string;
  token: string;
  userId?: string;
  facilityId?: string;
  alertType: PushPayloadType;
  status: PushDeliveryLog['status'];
  errorMessage?: string;
  sentAt: Date;
  attempts?: number;
  nextRetryAt?: Date;
  checkedAt?: Date;
}): PushDeliveryLog {
  return {
    ticket_id: payload.ticketId,
    token: payload.token,
    user_id: payload.userId,
    facility_id: payload.facilityId,
    alert_type: payload.alertType,
    status: payload.status,
    error_message: payload.errorMessage,
    sent_at: payload.sentAt,
    receipt_check_attempts: payload.attempts,
    next_receipt_retry_at: payload.nextRetryAt,
    receipt_checked_at: payload.checkedAt,
  };
}

async function markTokenInactive(tokenCollection: ReturnType<Db['collection']> | Collection<PushTokenDoc>, token: string): Promise<void> {
  const now = new Date();
  await tokenCollection.updateOne(
    { token },
    {
      $set: {
        is_active: false,
        updated_at: now,
      },
    },
  );
}

async function checkRateLimitsForUsers(userIds: string[]): Promise<Set<string>> {
  const blocked = new Set<string>();

  if (userIds.length === 0) {
    return blocked;
  }

  await Promise.all(
    userIds.map(async (userId) => {
      try {
        const { allowed, remaining } = await checkRateLimit(
          `${PUSH_RATE_LIMIT_PREFIX}:${userId}`,
          MAX_PUSHES_PER_USER_PER_HOUR,
          PUSH_RATE_LIMIT_WINDOW_MS,
        );

        logger.debug('Push rate limit check', {
          userId,
          allowed,
          remaining,
          key: `${PUSH_RATE_LIMIT_PREFIX}:${userId}`,
        });

        if (!allowed) {
          blocked.add(userId);
        }
      } catch (error) {
        logger.warn('Push rate limit check failed; allowing temporarily', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  );

  return blocked;
}

export async function sendPushNotifications(
  db: Db,
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  options?: {
    channelId?: string;
    alertType?: PushPayloadType;
    facilityId?: string;
  },
): Promise<{ sent: number; failed: number }> {
  const sentResult = { sent: 0, failed: 0 };

  try {
    const database = await resolveDb(db);
    const deliveryCollection = database.collection<PushDeliveryLog>(U.PUSH_DELIVERY_LOG);
    const tokenCollection = database.collection<PushTokenDoc>(U.PUSH_TOKENS);

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return sentResult;
    }

    const uniqueInputTokens = [...new Set(tokens)];
    const alertType = normalizeAlertType(options?.alertType);
    const facilityId = options?.facilityId;

    const tokenDocs = await tokenCollection
      .find({ token: { $in: uniqueInputTokens }, is_active: true }, { projection: { token: 1, user_id: 1 } })
      .toArray();

    const tokenToUser = new Map(tokenDocs.map((doc) => [doc.token, doc.user_id]));
    const activeTokens = [...new Set(tokenDocs.map((doc) => doc.token))];
    const preflightLogs: PushDeliveryLog[] = [];
    const now = new Date();

    for (const token of uniqueInputTokens) {
      if (!tokenToUser.has(token)) {
        preflightLogs.push(
          toSnakeCaseLog({
            ticketId: `missing-${token}-${Date.now()}`,
            token,
            facilityId,
            alertType,
            status: 'error',
            errorMessage: 'Token is not registered or not active',
            sentAt: now,
          }),
        );
        sentResult.failed += 1;
      }
    }

    const userIds = [...new Set(tokenDocs.map((doc) => doc.user_id).filter((id): id is string => Boolean(id)))];
    const blockedUsers = await checkRateLimitsForUsers(userIds);

    const blockedTokens = activeTokens.filter((token) => {
      const userId = tokenToUser.get(token);
      return typeof userId === 'string' && blockedUsers.has(userId);
    });

    for (const token of blockedTokens) {
      preflightLogs.push(
        toSnakeCaseLog({
          ticketId: `rate-limit-${token}-${Date.now()}`,
          token,
          userId: tokenToUser.get(token),
          facilityId,
          alertType,
          status: 'error',
          errorMessage: `Push rate limit exceeded (${MAX_PUSHES_PER_USER_PER_HOUR}/hour)`,
          sentAt: now,
        }),
      );
      sentResult.failed += 1;
    }

    if (preflightLogs.length > 0) {
      await deliveryCollection.insertMany(preflightLogs, { ordered: false }).catch((error) => {
        logger.error('Failed to write push delivery logs', {
          error: error instanceof Error ? error.message : String(error),
          count: preflightLogs.length,
        });
      });
    }

    const sendableTokens = activeTokens.filter((token) => !blockedTokens.includes(token));

    if (sendableTokens.length === 0) {
      return sentResult;
    }

    for (const tokenChunk of chunkArray(sendableTokens, MAX_TOKENS_PER_REQUEST)) {
      const chunkNow = new Date();
      const payloads: PushPayload[] = tokenChunk.map((token) => ({
        to: token,
        title,
        body,
        data: {
          ...data,
          payload_type: alertType,
        },
        channelId: options?.channelId,
        priority: alertType === 'TO_ALERT' ? 'high' : 'normal',
        sound: 'default',
      }));

      const chunkLogs: PushDeliveryLog[] = [];

      try {
        const response = await fetch(PUSH_SEND_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify(payloads),
        });

        const responseBody = (await response.json().catch(() => ({}))) as ExpoSendResponse;

        if (!response.ok || !Array.isArray(responseBody.data)) {
          const reason = extractErrorMessage(`Failed to send push payload: HTTP ${response.status}`, undefined);

          for (const token of tokenChunk) {
            chunkLogs.push(
              toSnakeCaseLog({
                ticketId: `fallback-${token}-${Date.now()}`,
                token,
                userId: tokenToUser.get(token),
                facilityId,
                alertType,
                status: 'error',
                errorMessage: reason,
                sentAt: chunkNow,
              }),
            );
            sentResult.failed += 1;
          }
        } else {
          for (let index = 0; index < tokenChunk.length; index += 1) {
            const token = tokenChunk[index];
            const result = responseBody.data[index];

            if (!result?.id) {
              chunkLogs.push(
                toSnakeCaseLog({
                  ticketId: `missing-${token}-${Date.now()}-${index}`,
                  token,
                  userId: tokenToUser.get(token),
                  facilityId,
                  alertType,
                  status: 'error',
                  errorMessage: 'Expo response missing ticket id',
                  sentAt: chunkNow,
                }),
              );
              sentResult.failed += 1;
              continue;
            }

            if (result.status === 'ok') {
              chunkLogs.push(
                toSnakeCaseLog({
                  ticketId: result.id,
                  token,
                  userId: tokenToUser.get(token),
                  facilityId,
                  alertType,
                  status: 'sent',
                  sentAt: chunkNow,
                }),
              );
              sentResult.sent += 1;
              continue;
            }

            chunkLogs.push(
              toSnakeCaseLog({
                ticketId: result.id,
                token,
                userId: tokenToUser.get(token),
                facilityId,
                alertType,
                status: 'error',
                errorMessage: extractErrorMessage(result.message, result.details),
                sentAt: chunkNow,
              }),
            );
            sentResult.failed += 1;

            if (isDeviceNotRegistered(result.message, result.details)) {
              await markTokenInactive(tokenCollection, token);
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown push sending error';

        for (const token of tokenChunk) {
          chunkLogs.push(
            toSnakeCaseLog({
              ticketId: `fetch-error-${token}-${Date.now()}`,
              token,
              userId: tokenToUser.get(token),
              facilityId,
              alertType,
              status: 'error',
              errorMessage: message,
              sentAt: chunkNow,
            }),
          );
          sentResult.failed += 1;
        }
      }

      if (chunkLogs.length > 0) {
        await deliveryCollection.insertMany(chunkLogs, { ordered: false }).catch((error) => {
          logger.error('Failed to write push delivery logs', {
            error: error instanceof Error ? error.message : String(error),
            count: chunkLogs.length,
          });
        });
      }
    }

    return sentResult;
  } catch (error) {
    logger.error('sendPushNotifications failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return sentResult;
  }
}

export async function sendToAlertPush(
  db: Db,
  userId: string,
  facilityName: string,
  ageClass: string,
  estimatedSlots: number,
  alertId: string,
  facilityId: string,
): Promise<boolean> {
  try {
    const tokens = await getActiveTokensForUser(db, userId);

    if (tokens.length === 0) {
      return false;
    }

    const title = `${facilityName} 대기 알림`;
    const body = `${ageClass} 반 대기 추적: 현재 예상 슬롯 ${estimatedSlots}개 (알림 ID ${alertId})`;

    const result = await sendPushNotifications(
      db,
      tokens,
      title,
      body,
      {
        payload_type: 'TO_ALERT',
        alert_id: alertId,
        facility_id: facilityId,
        facility_name: facilityName,
        age_class: ageClass,
        estimated_slots: estimatedSlots,
      },
      {
        channelId: 'to-alerts',
        alertType: 'TO_ALERT',
        facilityId,
      },
    );

    return result.sent > 0;
  } catch (error) {
    logger.error('sendToAlertPush failed', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      facilityId,
    });
    return false;
  }
}

export async function checkPushReceipts(db: Db): Promise<{ checked: number; ok: number; errors: number }> {
  const summary = { checked: 0, ok: 0, errors: 0 };

  try {
    const database = await resolveDb(db);
    const deliveryCollection = database.collection<PushDeliveryLog>(U.PUSH_DELIVERY_LOG);
    const tokenCollection = database.collection<PushTokenDoc>(U.PUSH_TOKENS);

    const now = new Date();

    const pending = await deliveryCollection
      .find({
        status: 'sent',
        $or: [
          { next_receipt_retry_at: { $exists: false } },
          { next_receipt_retry_at: { $lte: now } },
        ],
      })
      .toArray();

    if (pending.length === 0) {
      return summary;
    }

    const pendingByTicketId = new Map(pending.map((item) => [item.ticket_id, item]));

    for (const batch of chunkArray(pending, MAX_TOKENS_PER_REQUEST)) {
      const ids = batch.map((item) => item.ticket_id);
      const batchNow = new Date();
      let responseBody: ExpoReceiptResponse = {};
      let responseFailed = false;

      try {
        const response = await fetch(PUSH_RECEIPT_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify({ ids }),
        });

        responseBody = (await response.json().catch(() => ({}))) as ExpoReceiptResponse;

        if (!response.ok || typeof responseBody.data !== 'object') {
          responseFailed = true;
        }
      } catch (error) {
        logger.error('Failed to fetch push receipts batch', {
          error: error instanceof Error ? error.message : String(error),
          count: ids.length,
        });
        responseFailed = true;
      }

      if (responseFailed) {
        await Promise.all(
          batch.map(async (item) => {
            const nextAttempt = (item.receipt_check_attempts ?? 0) + 1;

            if (nextAttempt >= MAX_RECEIPT_RETRY_ATTEMPTS) {
              await deliveryCollection.updateOne(
                { ticket_id: item.ticket_id },
                {
                  $set: {
                    status: 'error',
                    error_message: 'No receipt response from Expo after retries',
                    receipt_check_attempts: nextAttempt,
                    receipt_checked_at: batchNow,
                    last_receipt_check_at: batchNow,
                  },
                  $unset: {
                    next_receipt_retry_at: '',
                  },
                },
              );
              summary.checked += 1;
              summary.errors += 1;
            } else {
              await deliveryCollection.updateOne(
                { ticket_id: item.ticket_id },
                {
                  $set: {
                    status: 'sent',
                    receipt_check_attempts: nextAttempt,
                    last_receipt_check_at: batchNow,
                    next_receipt_retry_at: new Date(batchNow.getTime() + receiptRetryDelayMs(nextAttempt)),
                  },
                },
              );
            }
          }),
        );

        continue;
      }

      const receiptMap = responseBody.data || {};

      for (const id of ids) {
        const log = pendingByTicketId.get(id);

        if (!log) {
          continue;
        }

        const receipt = receiptMap[id];

        if (!receipt) {
          const nextAttempt = (log.receipt_check_attempts ?? 0) + 1;

          if (nextAttempt >= MAX_RECEIPT_RETRY_ATTEMPTS) {
            await deliveryCollection.updateOne(
              { ticket_id: id },
              {
                $set: {
                  status: 'error',
                  error_message: `No receipt yet after ${nextAttempt} checks`,
                  receipt_check_attempts: nextAttempt,
                  receipt_checked_at: batchNow,
                  last_receipt_check_at: batchNow,
                },
                $unset: {
                  next_receipt_retry_at: '',
                },
              },
            );
            summary.checked += 1;
            summary.errors += 1;
          } else {
            await deliveryCollection.updateOne(
              { ticket_id: id },
              {
                $set: {
                  status: 'sent',
                  receipt_check_attempts: nextAttempt,
                  last_receipt_check_at: batchNow,
                  next_receipt_retry_at: new Date(batchNow.getTime() + receiptRetryDelayMs(nextAttempt)),
                },
              },
            );
          }

          continue;
        }

        const nextAttempt = (log.receipt_check_attempts ?? 0) + 1;

        if (receipt.status === 'ok') {
          await deliveryCollection.updateOne(
            { ticket_id: id },
            {
              $set: {
                status: 'ok',
                receipt_checked_at: batchNow,
                last_receipt_check_at: batchNow,
                receipt_check_attempts: nextAttempt,
              },
              $unset: {
                next_receipt_retry_at: '',
                error_message: '',
              },
            },
          );
          summary.checked += 1;
          summary.ok += 1;
          continue;
        }

        await deliveryCollection.updateOne(
          { ticket_id: id },
          {
            $set: {
              status: 'error',
              error_message: extractErrorMessage(receipt.message, receipt.details),
              receipt_checked_at: batchNow,
              last_receipt_check_at: batchNow,
              receipt_check_attempts: nextAttempt,
            },
            $unset: {
              next_receipt_retry_at: '',
            },
          },
        );
        summary.checked += 1;
        summary.errors += 1;

        if (isDeviceNotRegistered(receipt.message, receipt.details)) {
          await markTokenInactive(tokenCollection, log.token);
        }
      }
    }

    return summary;
  } catch (error) {
    logger.error('checkPushReceipts failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return summary;
  }
}

export async function cleanupExpiredPushTickets(db: Db, olderThan?: Date): Promise<number> {
  try {
    const database = await resolveDb(db);
    const deliveryCollection = database.collection<PushDeliveryLog>(U.PUSH_DELIVERY_LOG);

    const cutoff = olderThan ?? new Date(Date.now() - RECEIPT_TTL_MS);
    const result = await deliveryCollection.deleteMany({
      status: 'sent',
      sent_at: { $lt: cutoff },
    });

    return result.deletedCount || 0;
  } catch (error) {
    logger.error('cleanupExpiredPushTickets failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

export async function cleanupInactiveTokens(db: Db, olderThan?: Date): Promise<number> {
  try {
    const database = await resolveDb(db);
    const tokenCollection = database.collection<PushTokenDoc>(U.PUSH_TOKENS);

    const cutoff = olderThan ?? new Date(0);
    const result = await tokenCollection.deleteMany({
      is_active: false,
      updated_at: { $lt: cutoff },
    });

    return result.deletedCount || 0;
  } catch (error) {
    logger.error('cleanupInactiveTokens failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

export async function getActiveTokensForUser(db: Db, userId: string): Promise<string[]> {
  try {
    const database = await resolveDb(db);
    const tokenCollection = database.collection<PushTokenDoc>(U.PUSH_TOKENS);

    const docs = await tokenCollection
      .find({ user_id: userId, is_active: true }, { projection: { token: 1 } })
      .toArray();

    return docs.map((doc) => doc.token);
  } catch (error) {
    logger.error('getActiveTokensForUser failed', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    return [];
  }
}
