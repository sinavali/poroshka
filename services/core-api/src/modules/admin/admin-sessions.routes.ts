import { Hono } from 'hono';
import { pool } from '../../infrastructure/database/client.ts';
import { logger } from '../../infrastructure/observability/pino-logger.ts';

export const adminSessionsRoutes = new Hono();

// 1. Get active sessions for a specific user
adminSessionsRoutes.get('/users/:id/sessions', async (c) => {
  const userId = c.req.param('id');
  const res = await pool.query(`
    SELECT token_hash as id, device_label, ip_address, expires_at, created_at
    FROM auth_sessions
    WHERE user_id = $1
    ORDER BY created_at DESC;
  `, [userId]);

  return c.json(res.rows);
});

// 2. Terminate a specific session for a user
adminSessionsRoutes.delete('/users/:id/sessions/:sessionId', async (c) => {
  const adminUser = c.get('adminUser' as never) as { id: string; role: string };
  if (!['ADMIN', 'OPERATOR'].includes(adminUser.role)) {
    return c.json({ error: 'FORBIDDEN', message: 'عدم دسترسی' }, 403);
  }

  const userId = c.req.param('id');
  const sessionId = c.req.param('sessionId');

  const res = await pool.query(`
    DELETE FROM auth_sessions
    WHERE user_id = $1 AND (token_hash = $2 OR token_hash LIKE $3)
    RETURNING token_hash;
  `, [userId, sessionId, `${sessionId}%`]);

  if (res.rowCount === 0) {
    return c.json({ error: 'SESSION_NOT_FOUND', message: 'نشست مورد نظر یافت نشد یا پیش‌تر منقضی شده است.' }, 404);
  }

  logger.info({ userId, sessionId, adminId: adminUser.id }, 'User session terminated by admin');
  return c.json({ ok: true, message: 'نشست کاربر با موفقیت مسدود و خاتمه یافت.' });
});

// 3. Force logout / terminate ALL sessions for a specific user
adminSessionsRoutes.post('/users/:id/sessions/terminate-all', async (c) => {
  const adminUser = c.get('adminUser' as never) as { id: string; role: string };
  if (!['ADMIN', 'OPERATOR'].includes(adminUser.role)) {
    return c.json({ error: 'FORBIDDEN', message: 'عدم دسترسی' }, 403);
  }

  const userId = c.req.param('id');

  const res = await pool.query(`
    DELETE FROM auth_sessions
    WHERE user_id = $1
    RETURNING token_hash;
  `, [userId]);

  logger.info({ userId, count: res.rowCount, adminId: adminUser.id }, 'All sessions terminated for user');
  return c.json({
    ok: true,
    terminated_count: res.rowCount,
    message: `${res.rowCount} نشست فعال کاربر با موفقیت خاتمه یافت.`
  });
});

// 4. Force logout ALL user sessions across the entire system (Superadmin only)
// Preserves the calling admin's current session so they are not kicked out!
adminSessionsRoutes.post('/sessions/terminate-all-users', async (c) => {
  const adminUser = c.get('adminUser' as never) as { id: string; role: string };
  if (adminUser.role !== 'ADMIN') {
    return c.json({ error: 'FORBIDDEN', message: 'تنها مدیر ارشد سامانه مجاز به ابطال سراسری تمام نشست‌هاست.' }, 403);
  }

  const currentTokenHash = (c.get('tokenHash' as never) as string) || '';

  const res = await pool.query(`
    DELETE FROM auth_sessions
    WHERE token_hash != $1
    RETURNING token_hash;
  `, [currentTokenHash]);

  logger.warn({ count: res.rowCount, callerAdmin: adminUser.id }, 'Global session flush executed: all other user sessions terminated');

  return c.json({
    ok: true,
    terminated_count: res.rowCount,
    message: `تمام نشست‌های فعال کاربران (${res.rowCount} نشست) در سرتاسر پلتفرم با موفقیت خاتمه یافتند.`
  });
});
