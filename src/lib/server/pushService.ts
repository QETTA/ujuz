import { Db } from 'mongodb';

import { logger } from './logger';
import { getDbOrThrow } from './db';

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
  alert_type: 'to_alert' | 'general' | 'marketing';
  status: 'sent' | 'ok' | 'error';
  error_message?: string;
  sent_at: Date;
  receipt_checked_at?: Date;
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

function toSnakeCaseLog(payload: {
  ticketId: string;
  token: string;
  userId?: string;
  facilityId?: string;
  alertType: 'to_alert' | 'general' | 'marketing';
  status: PushDeliveryLog['status'];
  errorMessage?: string;
  sentAt: Date;
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
  };
}

export async function sendPushNotifications(
  db: Db,
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  options?: {
    channelId?: string;
    alertType?: 'to_alert' | 'general' | 'marketing';
    facilityId?: string;
  },
): Promise<{ sent: number; failed: number }> {
  const sentResult = { sent: 0, failed: 0 };

  try {
    const database = await resolveDb(db);
    const deliveryCollection = database.collection<PushDeliveryLog>('push_delivery_log');
    const tokenCollection = database.collection<PushTokenDoc>('push_tokens');

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return sentResult;
    }

    const tokenDocs = await tokenCollection
      .find({ token: { $in: tokens } }, { projection: { token: 1, user_id: 1 } })
      .toArray();
    const userByToken = new Map<string, string | undefined>(
      tokenDocs.map((doc) => [doc.token, doc.user_id]),
    );

    const alertType = options?.alertType || 'general';
    const facilityId = options?.facilityId;

    for (const tokenChunk of chunkArray(tokens, MAX_TOKENS_PER_REQUEST)) {
      const now = new Date();
      const payloads: PushPayload[] = tokenChunk.map((token) => ({
        to: token,
        title,
        body,
        data,
        channelId: options?.channelId,
        priority: alertType === 'to_alert' ? 'high' : undefined,
      }));

      const logs: PushDeliveryLog[] = [];

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
          const reason = extractErrorMessage(undefined, {
            error: `Failed to send push payload: HTTP ${response.status}`,
          });

          for (const token of tokenChunk) {
            logs.push(
              toSnakeCaseLog({
                ticketId: `fallback-${token}-${Date.now()}`,
                token,
                userId: userByToken.get(token),
                facilityId,
                alertType,
                status: 'error',
                errorMessage: reason,
                sentAt: now,
              }),
            );
            sentResult.failed += 1;
          }
        } else {
          for (let index = 0; index < tokenChunk.length; index += 1) {
            const token = tokenChunk[index];
            const result = responseBody.data[index];

            if (!result?.id) {
              logs.push(
                toSnakeCaseLog({
                  ticketId: `missing-${token}-${Date.now()}-${index}`,
                  token,
                  userId: userByToken.get(token),
                  facilityId,
                  alertType,
                  status: 'error',
                  errorMessage: 'Expo response missing ticket id',
                  sentAt: now,
                }),
              );
              sentResult.failed += 1;
              continue;
            }

            if (result.status === 'ok') {
              sentResult.sent += 1;
              logs.push(
                toSnakeCaseLog({
                  ticketId: result.id,
                  token,
                  userId: userByToken.get(token),
                  facilityId,
                  alertType,
                  status: 'sent',
                  sentAt: now,
                }),
              );
            } else {
              sentResult.failed += 1;
              logs.push(
                toSnakeCaseLog({
                  ticketId: result.id,
                  token,
                  userId: userByToken.get(token),
                  facilityId,
                  alertType,
                  status: 'error',
                  errorMessage: extractErrorMessage(result.message, result.details),
                  sentAt: now,
                }),
              );
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown push sending error';

        for (const token of tokenChunk) {
          logs.push(
            toSnakeCaseLog({
              ticketId: `fetch-error-${token}-${Date.now()}`,
              token,
              userId: userByToken.get(token),
              facilityId,
              alertType,
              status: 'error',
              errorMessage: message,
              sentAt: now,
            }),
          );
          sentResult.failed += 1;
        }
      }

      if (logs.length > 0) {
        await deliveryCollection.insertMany(logs, { ordered: false }).catch((error) => {
          logger.error('Failed to write push delivery logs', {
            error: error instanceof Error ? error.message : String(error),
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
    const body = `${ageClass} 반 대기 추적: 현재 예상 슬롯 ${estimatedSlots}개, 즉시 알림 ID ${alertId}`;

    const result = await sendPushNotifications(
      db,
      tokens,
      title,
      body,
      {
        alert_id: alertId,
        facility_id: facilityId,
        facility_name: facilityName,
        age_class: ageClass,
        estimated_slots: estimatedSlots,
      },
      {
        channelId: 'to-alerts',
        alertType: 'to_alert',
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
    const deliveryCollection = database.collection<PushDeliveryLog>('push_delivery_log');
    const tokenCollection = database.collection<PushTokenDoc>('push_tokens');

    const pending = await deliveryCollection
      .find({ status: 'sent', receipt_checked_at: { $exists: false } })
      .toArray();

    if (pending.length === 0) {
      return summary;
    }

    const chunks = chunkArray(pending, MAX_TOKENS_PER_REQUEST);

    for (const batch of chunks) {
      const ids = batch.map((item) => item.ticket_id);
      const now = new Date();

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

        const responseBody = (await response.json().catch(() => ({}))) as ExpoReceiptResponse;
        const receiptMap = responseBody.data || {};

        for (const id of ids) {
          const receipt = receiptMap[id];
          if (!receipt) {
            continue;
          }

          const matched = await deliveryCollection.findOne({ ticket_id: id });
          if (!matched) {
            continue;
          }

          const payload: Record<string, unknown> = {
            status: receipt.status === 'ok' ? 'ok' : 'error',
            receipt_checked_at: now,
          };

          if (receipt.status === 'error') {
            payload.error_message = extractErrorMessage(receipt.message, receipt.details);
          }

          await deliveryCollection.updateOne({ _id: matched._id }, { $set: payload });

          summary.checked += 1;

          if (receipt.status === 'ok') {
            summary.ok += 1;
            continue;
          }

          summary.errors += 1;

          if (receipt.details?.error === 'DeviceNotRegistered') {
            await tokenCollection.updateOne(
              { token: matched.token },
              { $set: { is_active: false, updated_at: now } },
            );
          }
        }
      } catch (error) {
        logger.error('Failed to fetch push receipts batch', {
          error: error instanceof Error ? error.message : String(error),
        });
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

export async function cleanupInactiveTokens(db: Db, olderThan?: Date): Promise<number> {
  try {
    const database = await resolveDb(db);
    const tokenCollection = database.collection<PushTokenDoc>('push_tokens');

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
    const tokenCollection = database.collection<PushTokenDoc>('push_tokens');

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
