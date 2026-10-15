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

// 1. Dashboard Overview (Resolves 404 & supplies high-level KPIs)
adminRoutes.get('/overview', async (c) => {
  const statsRes = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM prompts) as prompts_count,
      (SELECT COUNT(*) FROM prompts WHERE is_published = true) as published_count,
      (SELECT COALESCE(SUM(copy_count), 0) FROM prompts) as total_copies,
      (SELECT COALESCE(SUM(view_count), 0) FROM prompts) as total_views,
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM auth_sessions WHERE expires_at > NOW()) as active_sessions,
      (SELECT COUNT(*) FROM outbox_events WHERE status = 'PENDING') as pending_outbox;
  `);

  const adConfigsRes = await pool.query(`
    SELECT id, placement_slot, provider, zone_id, is_active, script_tag_html
    FROM ad_network_configs
    ORDER BY created_at ASC;
  `);

  const topPromptsRes = await pool.query(`
    SELECT id, slug, title_fa, modality, copy_count, view_count, trending_score_7d
    FROM prompts
    WHERE is_published = true
    ORDER BY copy_count DESC
    LIMIT 5;
  `);

  const recentUsersRes = await pool.query(`
    SELECT id, phone_e164, role, is_phone_verified, is_blocked, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 5;
  `);

  const recentLogs = sqliteLogger.getRecentLogs(25);
  const securityEvents = sqliteLogger.getRecentSecurityEvents(10);

  return c.json({
    stats: statsRes.rows[0],
    ad_configs: adConfigsRes.rows,
    top_prompts: topPromptsRes.rows,
    recent_users: recentUsersRes.rows,
    recent_logs: recentLogs,
    security_events: securityEvents
  });
});

// 2. Full User Management: List Users with Search & Copy Stats
adminRoutes.get('/users', async (c) => {
  const q = c.req.query('q')?.trim();
  const role = c.req.query('role');
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  let query = `
    SELECT 
      u.id, u.phone_e164, u.role, u.is_phone_verified, u.is_blocked, u.last_login_at, u.created_at,
      COUNT(DISTINCT ucp.id) as total_copied_prompts,
      COALESCE(SUM(ucp.copy_count), 0) as total_prompt_executions
    FROM users u
    LEFT JOIN user_copied_prompts ucp ON u.id = ucp.user_id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let pIdx = 1;

  if (q) {
    query += ` AND u.phone_e164 ILIKE $${pIdx++}`;
    params.push(`%${q}%`);
  }
  if (role) {
    query += ` AND u.role = $${pIdx++}`;
    params.push(role);
  }

  query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`;
  params.push(limit, offset);

  const res = await pool.query(query, params);
  const countRes = await pool.query('SELECT COUNT(*) FROM users');

  return c.json({
    users: res.rows,
    total: parseInt(countRes.rows[0].count, 10),
    page,
    limit
  });
});

// 3. User Details: Sessions & Copied History
adminRoutes.get('/users/:id', async (c) => {
  const id = c.req.param('id');
  const userRes = await pool.query('SELECT id, phone_e164, role, is_phone_verified, is_blocked, last_login_at, created_at FROM users WHERE id = $1', [id]);
  if (userRes.rows.length === 0) return c.json({ error: 'USER_NOT_FOUND' }, 404);

  const historyRes = await pool.query(`
    SELECT ucp.id, ucp.copy_count, ucp.custom_values_json, ucp.compiled_text, ucp.last_copied_at,
           p.slug, p.title_fa, p.modality
    FROM user_copied_prompts ucp
    JOIN prompts p ON ucp.prompt_id = p.id
    WHERE ucp.user_id = $1
    ORDER BY ucp.last_copied_at DESC
    LIMIT 50;
  `, [id]);

  const sessionsRes = await pool.query(
    'SELECT id, device_label, ip_address, expires_at, created_at FROM auth_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
    [id]
  );

  return c.json({
    user: userRes.rows[0],
    copied_history: historyRes.rows,
    active_sessions: sessionsRes.rows
  });
});

// 4. Update User Role or Block Status
adminRoutes.patch('/users/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { role, is_blocked } = body;

  await pool.query(`
    UPDATE users
    SET 
      role = COALESCE($1, role),
      is_blocked = COALESCE($2, is_blocked),
      updated_at = NOW()
    WHERE id = $3;
  `, [role, is_blocked, id]);

  return c.json({ ok: true, message: 'اطلاعات کاربر با موفقیت به‌روزرسانی شد.' });
});

// 5. System Settings: Get All Configs
adminRoutes.get('/settings', async (c) => {
  const res = await pool.query(`
    SELECT id, setting_key, setting_value, category, description_fa, updated_at
    FROM system_settings
    ORDER BY category ASC, setting_key ASC;
  `);
  return c.json(res.rows);
});

// 6. System Settings: Update Specific Config
adminRoutes.put('/settings/:key', async (c) => {
  const key = c.req.param('key');
  const body = await c.req.json().catch(() => ({}));

  await pool.query(`
    UPDATE system_settings
    SET 
      setting_value = $1,
      updated_at = NOW()
    WHERE setting_key = $2;
  `, [JSON.stringify(body.setting_value || {}), key]);

  return c.json({ ok: true, message: 'تنظیمات با موفقیت ذخیره شد.' });
});

// 7. Granular Reports Engine (7 Detailed Reports)
adminRoutes.get('/reports/:type', async (c) => {
  const type = c.req.param('type');

  if (type === 'velocity') {
    // Report 1: Prompt Velocity & Conversion Funnel
    const res = await pool.query(`
      SELECT p.id, p.slug, p.title_fa, p.modality, p.copy_count, p.view_count,
             CASE WHEN p.view_count > 0 THEN ROUND((p.copy_count::numeric / p.view_count) * 100, 1) ELSE 0 END as conversion_rate
      FROM prompts p
      WHERE p.is_published = true
      ORDER BY p.copy_count DESC
      LIMIT 20;
    `);
    return c.json({ report: 'velocity', data: res.rows });
  }

  if (type === 'model-demand') {
    // Report 2: AI Model Distribution
    const res = await pool.query(`
      SELECT unnest(supported_models) as model, COUNT(*) as prompt_count, SUM(copy_count) as total_copies
      FROM prompts
      WHERE is_published = true
      GROUP BY model
      ORDER BY total_copies DESC;
    `);
    return c.json({ report: 'model-demand', data: res.rows });
  }

  if (type === 'ad-yield') {
    // Report 3: Ad Monetization Yield
    const res = await pool.query(`
      SELECT id, placement_slot, provider, zone_id, is_active
      FROM ad_network_configs;
    `);
    const clickAudits = sqliteLogger.getRecentSecurityEvents(20);
    return c.json({ report: 'ad-yield', ad_units: res.rows, click_audits: clickAudits });
  }

  if (type === 'search-insights') {
    // Report 4: Search Keywords & Zero-Result Analytics
    const topKeywords = await pool.query(`
      SELECT search_keywords_fa, SUM(copy_count) as copies
      FROM prompts
      GROUP BY search_keywords_fa
      ORDER BY copies DESC
      LIMIT 15;
    `);
    return c.json({ report: 'search-insights', top_keywords: topKeywords.rows });
  }

  if (type === 'ingestion-health') {
    // Report 5: Ingestion Pipeline Health
    const res = await pool.query(`
      SELECT id, batch_name, total_rows, processed_rows, skipped_duplicates, failed_rows, is_paused, created_at
      FROM ingestion_batches
      ORDER BY created_at DESC
      LIMIT 10;
    `);
    return c.json({ report: 'ingestion-health', batches: res.rows });
  }

  if (type === 'messengers') {
    // Report 6: Bot Relay & Delivery Stats
    const outboxStats = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM outbox_events
      GROUP BY status;
    `);
    return c.json({ report: 'messengers', outbox_breakdown: outboxStats.rows });
  }

  // Report 7: System & Security Audits
  const logs = sqliteLogger.getRecentLogs(30);
  const security = sqliteLogger.getRecentSecurityEvents(15);
  return c.json({ report: 'system-health', logs, security });
});

// 8. List Prompts for Admin
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

// 9. Toggle Prompt Published / Locked
adminRoutes.patch('/prompts/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

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

// 10. Update Ad Network Config
adminRoutes.put('/ad-configs/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

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
