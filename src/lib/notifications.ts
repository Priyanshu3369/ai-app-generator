import { v4 as uuidv4 } from 'uuid';
import { query } from './db/pool';
import { NotificationConfig } from './types';

export async function createNotification(
  appId: string,
  userId: string | null,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  const id = uuidv4();
  await query(
    `INSERT INTO _platform_notifications (id, app_id, user_id, title, message, metadata) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, appId, userId, title, message, JSON.stringify(metadata || {})]
  );
  return { id, appId, userId, title, message, read: false, metadata };
}

export async function getNotifications(appId: string, userId?: string, unreadOnly = false) {
  let sql = `SELECT * FROM _platform_notifications WHERE app_id = $1`;
  const params: unknown[] = [appId];
  if (userId) { sql += ` AND (user_id = $2 OR user_id IS NULL)`; params.push(userId); }
  if (unreadOnly) { sql += ` AND read = FALSE`; }
  sql += ` ORDER BY created_at DESC LIMIT 50`;
  const result = await query(sql, params);
  return result.rows;
}

export async function markAsRead(notificationId: string) {
  await query(`UPDATE _platform_notifications SET read = TRUE WHERE id = $1`, [notificationId]);
}

export async function markAllAsRead(appId: string, userId: string) {
  await query(`UPDATE _platform_notifications SET read = TRUE WHERE app_id = $1 AND user_id = $2`, [appId, userId]);
}

export function processEventTriggers(
  triggers: NotificationConfig[],
  eventModel: string,
  eventAction: string,
  record: Record<string, unknown>,
  appId: string,
  userId: string | null
) {
  const matching = triggers.filter(t => t.model === eventModel && t.action === eventAction);
  for (const trigger of matching) {
    let title = trigger.title;
    let message = trigger.message;
    // Replace {{field}} placeholders with actual values
    for (const [key, value] of Object.entries(record)) {
      title = title.replace(new RegExp(`{{${key}}}`, 'g'), String(value ?? ''));
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value ?? ''));
    }
    createNotification(appId, userId, title, message, { model: eventModel, action: eventAction, recordId: record.id });
    
    // MOCK EMAIL TRIGGER
    const recipient = userId ? `user_${userId.substring(0,6)}@app.local` : 'admin@app.local';
    sendMockEmail(recipient, title, `<p>${message}</p>`).catch(() => {});
  }
}

export async function sendMockEmail(to: string, subject: string, html: string) {
  // Mock email — logs to console. In production, use nodemailer with real SMTP.
  console.log(`📧 Mock Email Sent:\n  To: ${to}\n  Subject: ${subject}\n  Body: ${html.substring(0, 200)}...`);
  return { success: true, to, subject };
}
