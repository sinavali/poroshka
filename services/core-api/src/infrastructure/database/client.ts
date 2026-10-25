import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { logger } from '../observability/pino-logger.ts';

const { Pool } = pg;

const defaultDevDb = process.env.NODE_ENV === 'development' ? (process.env.DEV_DATABASE_URL || 'postgresql://localhost:5432/promptjoo_dev') : undefined;
const DATABASE_URL = process.env.DATABASE_URL || defaultDevDb;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Prevent unhandled error event crash when an idle client drops in pool
pool.on('error', (err) => {
  logger.warn({ err: err?.message }, 'Handled PostgreSQL pool client drop/error');
});

// Attach error listener to every new client to prevent unhandled 'error' events on sockets
pool.on('connect', (client) => {
  client.on('error', (err) => {
    logger.warn({ err: err?.message }, 'Handled PostgreSQL client socket error');
  });
});

export const db = drizzle(pool);

export async function checkDatabaseHealth(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const res = await pool.query('SELECT 1 as alive');
    const latencyMs = Date.now() - start;
    return { ok: res.rows[0]?.alive === 1, latencyMs };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    logger.error({ err }, 'Database health check failed');
    return { ok: false, latencyMs };
  }
}
