/**
 * Email service for TO alert notifications.
 * Uses nodemailer with SMTP (e.g. Brevo free tier 300/day).
 * Fire-and-forget: errors are logged but never thrown.
 */

import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { env } from './env';
import { logger } from './logger';
import type { TOAlertDoc } from './dbTypes';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send TO alert emails, grouped by user.
 * Returns the number of emails successfully queued/sent.
 */
export async function sendToAlertEmails(
  db: Db,
  alerts: TOAlertDoc[],
): Promise<number> {
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    logger.warn('SMTP not configured — skipping TO alert emails');
    return 0;
  }

  // Group alerts by user_id
  const byUser = new Map<string, TOAlertDoc[]>();
  for (const alert of alerts) {
    const list = byUser.get(alert.user_id) ?? [];
    list.push(alert);
    byUser.set(alert.user_id, list);
  }

  // Lazy-load nodemailer to avoid import errors when not installed
  let createTransport: typeof import('nodemailer')['createTransport'];
  try {
    const nodemailer = await import('nodemailer');
    createTransport = nodemailer.createTransport;
  } catch {
    logger.warn('nodemailer not installed — skipping email send');
    return 0;
  }

  const transport = createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  let sent = 0;

  for (const [userId, userAlerts] of byUser) {
    try {
      // Look up user email from the NextAuth users collection
      const filter = ObjectId.isValid(userId)
        ? { _id: new ObjectId(userId) }
        : { userId };
      const user = await db.collection('users').findOne(
        filter,
        { projection: { email: 1 } },
      );

      if (!user?.email) {
        logger.debug('No email for user, skipping', { userId });
        continue;
      }

      const mail = buildAlertEmail(userAlerts, user.email as string);
      await transport.sendMail({
        from: env.SMTP_FROM,
        ...mail,
      });
      sent++;
    } catch (err) {
      logger.error('Failed to send TO alert email', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  transport.close();
  return sent;
}

function buildAlertEmail(alerts: TOAlertDoc[], to: string): MailOptions {
  const facilityLines = alerts
    .map((a) => `<li><strong>${escapeHtml(a.facility_name)}</strong> — ${escapeHtml(a.age_class)}반 (예상 ${a.estimated_slots}명)</li>`)
    .join('\n');

  const subject = alerts.length === 1
    ? `[우쥬] ${alerts[0].facility_name}에서 ${alerts[0].age_class}반 TO 감지!`
    : `[우쥬] ${alerts.length}건의 TO가 감지되었습니다`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">빈자리(TO) 알림</h2>
      <p>관심 어린이집에서 TO가 감지되었습니다:</p>
      <ul>${facilityLines}</ul>
      <p style="margin-top: 16px;">
        <a href="https://ujuz.kr/to-alerts" style="background: #4f46e5; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
          알림 확인하기
        </a>
      </p>
      <p style="color: #71717a; font-size: 12px; margin-top: 24px;">
        이 알림은 우쥬 TO 알림 구독에 의해 자동 발송되었습니다.
      </p>
    </div>
  `;

  return { to, subject, html };
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
