import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { logger } from '../observability/pino-logger.ts';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:jsF68GOoGS5inojpHmRa@remote-respina-free.runflare.com:31725/promptjoo_db';

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  keepAlive: true
});

pool.on('error', (err) => {
  logger.error({ err: err.message }, 'Unexpected error on idle PostgreSQL client');
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
