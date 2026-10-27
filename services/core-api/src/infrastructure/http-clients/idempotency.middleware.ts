import type { MiddlewareHandler } from 'hono';
import crypto from 'node:crypto';
import { pool } from '../database/client.ts';
import { logger } from '../observability/pino-logger.ts';

export const idempotencyMiddleware: MiddlewareHandler = async (c, next) => {
  const method = c.req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  const idempotencyKey = c.req.header('idempotency-key');
  if (!idempotencyKey) {
    // If not provided on mutating route, proceed normally (or enforce per route)
    return next();
  }

  // Validate UUIDv4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(idempotencyKey)) {
    return c.json({ error: 'INVALID_IDEMPOTENCY_KEY_FORMAT', message: 'Idempotency-Key header must be a valid UUIDv4' }, 400);
  }

  let rawBody = '';
  try {
    rawBody = await c.req.text();
  } catch {
    rawBody = '';
  }

  const requestHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const actorScope = c.req.header('x-client-uuid') || c.req.header('x-forwarded-for') || 'anonymous';
  const endpointPath = c.req.path;

  // Check existing key
  const existing = await pool.query(
    'SELECT request_hash, response_status, response_body_json FROM idempotency_keys WHERE idempotency_key = $1',
    [idempotencyKey]
  );

  if (existing.rows.length > 0) {
    const record = existing.rows[0];
    if (record.request_hash !== requestHash) {
      return c.json({
        error: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
        message: 'Request payload does not match previously submitted payload for this key.'
      }, 409);
    }

    if (record.response_status === null) {
      return c.json({
        error: 'IDEMPOTENCY_IN_FLIGHT',
        message: 'A request with this Idempotency-Key is currently being processed.'
      }, 409);
    }

    // Replay stored response
    return c.json(record.response_body_json, record.response_status);
  }

  // Insert initial in-flight marker
  await pool.query(
    `INSERT INTO idempotency_keys (idempotency_key, actor_scope, endpoint_path, request_hash)
     VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
    [idempotencyKey, actorScope, endpointPath, requestHash]
  );

  // Execute downstream handler
  await next();

  // Save completed response
  try {
    const status = c.res.status;
    // Clone response to inspect JSON body
    const cloned = c.res.clone();
    const contentType = cloned.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const responseBody = await cloned.json();
      await pool.query(
        `UPDATE idempotency_keys
         SET response_status = $1, response_body_json = $2
         WHERE idempotency_key = $3`,
        [status, JSON.stringify(responseBody), idempotencyKey]
      );
    }
  } catch (err) {
    logger.error({ err }, 'Failed to update idempotency response body');
  }
};
