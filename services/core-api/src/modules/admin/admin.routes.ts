import { Hono } from 'hono';
import crypto from 'node:crypto';
import { pool } from '../../infrastructure/database/client.ts';
import { sqliteLogger } from '../../infrastructure/observability/sqlite-logger.ts';

export const adminRoutes = new Hono();

// Admin Authentication Middleware
adminRoutes.use('*', async (c, next) => {
  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED', message: 'توکن دسترسی معتبر نیست.' }, 401);
  }

  const rawToken = authHeader.slice(7).trim();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const res = await pool.query(`
    SELECT u.id, u.phone_e164, u.role
    FROM auth_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.is_blocked = false;
  `, [tokenHash]);

  if (res.rows.length === 0 || res.rows[0].role !== 'ADMIN') {
    return c.json({ error: 'FORBIDDEN', message: 'دسترسی فقط برای مدیر سیستم مجاز است.' }, 403);
  }

  c.set('adminUser' as never, res.rows[0] as never);
  return next();
});

// 1. Dashboard Stats
adminRoutes.get('/stats', async (c) => {
  const statsRes = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM prompts) as total_prompts,
      (SELECT COUNT(*) FROM prompts WHERE is_published = true) as published_prompts,
      (SELECT COALESCE(SUM(copy_count), 0) FROM prompts) as total_copies,
      (SELECT COALESCE(SUM(view_count), 0) FROM prompts) as total_views,
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM auth_sessions WHERE expires_at > NOW()) as active_sessions,
      (SELECT COUNT(*) FROM outbox_events WHERE status = 'PENDING') as pending_outbox;
  `);

  const recentLogs = sqliteLogger.getRecentLogs(20);
  const securityEvents = sqliteLogger.getRecentSecurityEvents(10);

  return c.json({
    metrics: statsRes.rows[0],
    recent_logs: recentLogs,
    security_events: securityEvents
  });
});

// 2. List Prompts for Admin
adminRoutes.get('/prompts', async (c) => {
  const res = await pool.query(`
    SELECT p.id, p.slug, p.title_fa, p.modality, c.title_fa as category_title,
           p.copy_count, p.view_count, p.is_published, p.is_admin_locked, p.created_at
    FROM prompts p
    JOIN categories c ON p.category_id = c.id
    ORDER BY p.created_at DESC
    LIMIT 100;
  `);
  return c.json(res.rows);
});

// 3. Toggle Prompt Published / Locked
adminRoutes.patch('/prompts/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  await pool.query(`
    UPDATE prompts
    SET 
      is_published = COALESCE($1, is_published),
      is_admin_locked = COALESCE($2, is_admin_locked),
      updated_at = NOW()
    WHERE id = $3;
  `, [body.is_published, body.is_admin_locked, id]);

  return c.json({ ok: true });
});

// 4. Update Ad Network Config
adminRoutes.put('/ad-configs/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  await pool.query(`
    UPDATE ad_network_configs
    SET 
      zone_id = COALESCE($1, zone_id),
      provider = COALESCE($2, provider),
      is_active = COALESCE($3, is_active),
      script_tag_html = COALESCE($4, script_tag_html)
    WHERE id = $5;
  `, [body.zone_id, body.provider, body.is_active, body.script_tag_html, id]);

  return c.json({ ok: true });
});
