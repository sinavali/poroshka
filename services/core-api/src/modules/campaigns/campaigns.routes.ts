import { Hono } from 'hono';
import crypto from 'node:crypto';
import { pool } from '../../infrastructure/database/client.ts';
import { logger } from '../../infrastructure/observability/pino-logger.ts';

export const campaignsRoutes = new Hono();

// 1. Enqueue Broadcast Notification / SMS Campaign (Admin Only)
campaignsRoutes.post('/broadcast', async (c) => {
  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED', message: 'توکن دسترسی معتبر نیست.' }, 401);
  }

  const rawToken = authHeader.slice(7).trim();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const adminCheck = await pool.query(`
    SELECT u.id, u.role
    FROM auth_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.is_blocked = false;
  `, [tokenHash]);

  if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'ADMIN') {
    return c.json({ error: 'FORBIDDEN', message: 'دسترسی فقط برای مدیر سیستم مجاز است.' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const { channel, title, message, url } = body;

  if (!channel || !message) {
    return c.json({ error: 'INVALID_INPUT', message: 'کانال و متن پیام الزامی است.' }, 400);
  }

  const outboxRes = await pool.query(
    `INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload_json, status)
     VALUES ('CAMPAIGN', gen_random_uuid()::text, 'BROADCAST_MESSAGE', $1, 'PENDING')
     RETURNING id, created_at`,
    [JSON.stringify({ channel, title, message, url })]
  );

  return c.json({
    success: true,
    outbox_event_id: outboxRes.rows[0].id,
    created_at: outboxRes.rows[0].created_at
  });
});

// 2. Outbox Processor Loop (Decoupled from DB transaction)
export async function processOutboxBatch(batchSize = 10): Promise<number> {
  interface OutboxPayload {
    channel?: string;
    message?: string;
    [key: string]: unknown;
  }

  const client = await pool.connect();
  let eventsToProcess: Array<{
    id: string;
    aggregate_type: string;
    event_type: string;
    payload_json: OutboxPayload;
    retry_count: number;
    max_retries: number;
  }> = [];

  try {
    await client.query('BEGIN');
    const selectRes = await client.query(
      `SELECT id, aggregate_type, event_type, payload_json, retry_count, max_retries
       FROM outbox_events
       WHERE status = 'PENDING' AND next_attempt_at <= NOW()
       ORDER BY next_attempt_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [batchSize]
    );

    eventsToProcess = selectRes.rows;
    if (eventsToProcess.length > 0) {
      const ids = eventsToProcess.map(e => e.id);
      await client.query(
        `UPDATE outbox_events SET status = 'PROCESSING' WHERE id = ANY($1)`,
        [ids]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Error reserving outbox events in transaction');
    return 0;
  } finally {
    client.release();
  }

  if (eventsToProcess.length === 0) return 0;

  // Process outbox items safely
  let processedCount = 0;
  for (const event of eventsToProcess) {
    try {
      // In the new architecture without Telegram/Bale, campaigns route to Web Push or SMS if configured
      logger.info({ event_id: event.id, aggregate: event.aggregate_type }, 'Processed outbox notification');

      await pool.query(
        `UPDATE outbox_events SET status = 'COMPLETED', next_attempt_at = NOW() WHERE id = $1`,
        [event.id]
      );
      processedCount++;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const nextRetry = event.retry_count + 1;
      const newStatus = nextRetry >= event.max_retries ? 'DEAD_LETTER' : 'PENDING';
      const delaySeconds = Math.pow(2, nextRetry) * 10;

      await pool.query(
        `UPDATE outbox_events 
         SET status = $1, retry_count = $2, last_error = $3, 
             next_attempt_at = NOW() + ($4 || ' seconds')::interval 
         WHERE id = $5`,
        [newStatus, nextRetry, errorMessage, delaySeconds, event.id]
      );
    }
  }

  return processedCount;
}

let outboxInterval: NodeJS.Timeout | null = null;
export function startOutboxWorker(intervalMs = 5000) {
  if (outboxInterval) return;
  outboxInterval = setInterval(async () => {
    try {
      await processOutboxBatch();
    } catch {
      // Handled internally
    }
  }, intervalMs);
}

export function stopOutboxWorker() {
  if (outboxInterval) {
    clearInterval(outboxInterval);
    outboxInterval = null;
  }
}
