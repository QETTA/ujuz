import { createHmac } from 'crypto';
import type { Db } from 'mongodb';
import { U } from './collections';
import { logger } from './logger';

export interface SmsDeliveryLog {
  user_id: string;
  phone: string;
  message: string;
  status: 'sent' | 'failed';
  request_id?: string;
  error_message?: string;
  sent_at: Date;
}

// Generate NCP API signature
function generateSignature(
  method: string,
  url: string,
  timestamp: string,
  accessKey: string,
  secretKey: string,
): string {
  const message = `${method} ${url}\n${timestamp}\n${accessKey}`;
  return createHmac('sha256', secretKey).update(message).digest('base64');
}

// Send SMS via NCP
export async function sendSms(
  db: Db,
  phone: string,
  message: string,
  userId?: string,
): Promise<boolean> {
  const accessKey = process.env.NCP_SMS_ACCESS_KEY;
  const secretKey = process.env.NCP_SMS_SECRET_KEY;
  const serviceId = process.env.NCP_SMS_SERVICE_ID;
  const fromNumber = process.env.NCP_SMS_FROM;

  if (!accessKey || !secretKey || !serviceId || !fromNumber) {
    logger.warn('NCP SMS not configured — skipping');
    return false;
  }

  const timestamp = Date.now().toString();
  const url = `/sms/v2/services/${serviceId}/messages`;
  const fullUrl = `https://sens.apigw.ntruss.com${url}`;
  const signature = generateSignature('POST', url, timestamp, accessKey, secretKey);

  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-ncp-apigw-timestamp': timestamp,
        'x-ncp-iam-access-key': accessKey,
        'x-ncp-apigw-signature-v2': signature,
      },
      body: JSON.stringify({
        type: 'SMS',
        from: fromNumber,
        content: message,
        messages: [{ to: phone.replace(/-/g, '') }],
      }),
    });

    const data = await response.json().catch(() => ({})) as { requestId?: string; statusCode?: string };

    if (response.ok && data.statusCode === '202') {
      // Log success
      await logSmsDelivery(db, {
        user_id: userId ?? 'unknown',
        phone,
        message,
        status: 'sent',
        request_id: data.requestId,
        sent_at: new Date(),
      });
      return true;
    }

    // Log failure
    await logSmsDelivery(db, {
      user_id: userId ?? 'unknown',
      phone,
      message,
      status: 'failed',
      error_message: `HTTP ${response.status}: ${JSON.stringify(data)}`,
      sent_at: new Date(),
    });
    return false;
  } catch (error) {
    logger.error('SMS send failed', {
      error: error instanceof Error ? error.message : String(error),
      phone,
    });
    await logSmsDelivery(db, {
      user_id: userId ?? 'unknown',
      phone,
      message,
      status: 'failed',
      error_message: error instanceof Error ? error.message : String(error),
      sent_at: new Date(),
    });
    return false;
  }
}

// Send TO alert SMS
export async function sendToAlertSms(
  db: Db,
  userId: string,
  phone: string,
  facilityName: string,
  ageClass: string,
  estimatedSlots: number,
): Promise<boolean> {
  const message = `[우쥬] ${facilityName} ${ageClass}반 TO ${estimatedSlots}명 감지! 자세한 내용은 앱에서 확인하세요.`;
  
  // SMS limit: 90 bytes (Korean ~30 chars). Truncate if needed.
  const truncated = message.length > 45 
    ? message.slice(0, 42) + '...'
    : message;

  return sendSms(db, phone, truncated, userId);
}

// Get SMS delivery stats
export async function getSmsDeliveryStats(
  db: Db,
  since: Date,
): Promise<{ total: number; sent: number; failed: number }> {
  const rows = await db.collection(U.SMS_DELIVERY_LOG)
    .aggregate<{ _id: string; count: number }>([
      { $match: { sent_at: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray();

  const stats = { total: 0, sent: 0, failed: 0 };
  for (const row of rows) {
    stats.total += row.count;
    if (row._id === 'sent') stats.sent = row.count;
    if (row._id === 'failed') stats.failed = row.count;
  }
  return stats;
}

// Internal: log SMS delivery
async function logSmsDelivery(db: Db, log: SmsDeliveryLog): Promise<void> {
  try {
    await db.collection(U.SMS_DELIVERY_LOG).insertOne(log);
  } catch (err) {
    logger.error('Failed to log SMS delivery', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
