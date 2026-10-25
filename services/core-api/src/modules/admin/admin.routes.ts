import { Hono } from 'hono';
import crypto from 'node:crypto';
import { pool } from '../../infrastructure/database/client.ts';
import { sqliteLogger } from '../../infrastructure/observability/sqlite-logger.ts';
import { logger } from '../../infrastructure/observability/pino-logger.ts';
import { redisService } from '../../infrastructure/cache/redis.ts';
import { bulkIngestionManager } from '../ingestion/bulk-ingestion.service.ts';
import { adminSessionsRoutes } from './admin-sessions.routes.ts';
import { adminEmbeddingRoutes } from './admin-embedding.routes.ts';

export const adminRoutes = new Hono();

// Mount Modular Sub-routes
adminRoutes.route('/', adminSessionsRoutes);
adminRoutes.route('/', adminEmbeddingRoutes);

// Admin Authentication Middleware
adminRoutes.use('*', async (c, next) => {
  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED', message: 'توکن دسترسی معتبر نیست.' }, 401);
  }

  const rawToken = authHeader.slice(7).trim();

  const superadminToken = process.env.SUPERADMIN_TOKEN;
  if (superadminToken && rawToken === superadminToken) {
    c.set('adminUser' as never, { id: 'superadmin', role: 'ADMIN', phone_e164: 'superadmin' } as never);
    return next();
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const res = await pool.query(`
    SELECT u.id, u.phone_e164, u.role
    FROM auth_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.is_blocked = false;
  `, [tokenHash]);

  if (res.rows.length === 0 || !['ADMIN', 'OPERATOR'].includes(res.rows[0].role)) {
    return c.json({ error: 'FORBIDDEN', message: 'دسترسی فقط برای مدیران و اپراتورهای سیستم مجاز است.' }, 403);
  }

  c.set('adminUser' as never, res.rows[0] as never);
  c.set('tokenHash' as never, tokenHash as never);
  return next();
});

// Current Admin / Operator Profile
adminRoutes.get('/me', async (c) => {
  const adminUser = c.get('adminUser' as never) as { id: string; phone_e164: string; role: string } | undefined;
  if (!adminUser) return c.json({ error: 'UNAUTHORIZED' }, 401);
  return c.json({
    user: adminUser
  });
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

  let countQuery = 'SELECT COUNT(*) FROM users u WHERE 1=1';
  const countParams: unknown[] = [];
  let cIdx = 1;
  if (q) {
    countQuery += ` AND u.phone_e164 ILIKE $${cIdx++}`;
    countParams.push(`%${q}%`);
  }
  if (role) {
    countQuery += ` AND u.role = $${cIdx++}`;
    countParams.push(role);
  }
  const countRes = await pool.query(countQuery, countParams);

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
  const userRes = await pool.query('SELECT id, phone_e164, role, is_phone_verified, is_blocked, saved_context_profile_json, last_login_at, created_at FROM users WHERE id = $1', [id]);
  if (userRes.rows.length === 0) return c.json({ error: 'USER_NOT_FOUND' }, 404);

  const historyRes = await pool.query(`
    SELECT ucp.id, ucp.copy_count, ucp.custom_values_json, ucp.compiled_text, ucp.last_copied_at,
           COALESCE(p.slug, '') as slug,
           COALESCE(p.title_fa, ucp.custom_title_fa, 'پرامپت شخصی') as title_fa,
           COALESCE(p.modality::text, ucp.custom_modality, 'text_writing') as modality
    FROM user_copied_prompts ucp
    LEFT JOIN prompts p ON ucp.prompt_id = p.id
    WHERE ucp.user_id = $1
    ORDER BY ucp.last_copied_at DESC
    LIMIT 50;
  `, [id]);

  const sessionsRes = await pool.query(
    'SELECT token_hash as id, device_label, ip_address, expires_at, created_at FROM auth_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
    [id]
  );

  return c.json({
    user: userRes.rows[0],
    copied_history: historyRes.rows,
    active_sessions: sessionsRes.rows
  });
});

// 4. Update User Role or Block Status (Elevate/Deelevate & Self-Management Protection)
adminRoutes.patch('/users/:id', async (c) => {
  const adminUser = c.get('adminUser' as never) as { id: string; role: string; phone_e164: string };
  const targetId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { role, is_blocked } = body;

  // Consistency Rule: Admins cannot ban, demote, or modify their own authenticated account
  if (adminUser.id === targetId) {
    return c.json({ 
      error: 'SELF_MODIFICATION_FORBIDDEN', 
      message: 'شما نمی‌توانید حساب کاربری خودتان را معلق، تغییر نقش یا ویرایش کنید.' 
    }, 400);
  }

  const targetCheck = await pool.query('SELECT id, role, phone_e164 FROM users WHERE id = $1', [targetId]);
  if (targetCheck.rows.length === 0) {
    return c.json({ error: 'USER_NOT_FOUND', message: 'کاربر مورد نظر یافت نشد.' }, 404);
  }
  const targetUser = targetCheck.rows[0];

  // Operator Restrictions
  if (adminUser.role === 'OPERATOR') {
    if (role !== undefined && role !== targetUser.role) {
      return c.json({ error: 'FORBIDDEN', message: 'تنها مدیر ارشد مجاز به ارتقا یا تنزل نقش کاربران است.' }, 403);
    }
    if (targetUser.role === 'ADMIN' || targetUser.role === 'OPERATOR') {
      return c.json({ error: 'FORBIDDEN', message: 'اپراتورها دسترسی به تغییر وضعیت مدیران یا سایر اپراتورها را ندارند.' }, 403);
    }
  }

  // Role validation
  if (role && !['ADMIN', 'OPERATOR', 'USER'].includes(role)) {
    return c.json({ error: 'INVALID_ROLE', message: 'نقش نامعتبر است. نقش‌های مجاز: ADMIN, OPERATOR, USER' }, 400);
  }

  await pool.query(`
    UPDATE users
    SET 
      role = COALESCE($1, role),
      is_blocked = COALESCE($2, is_blocked),
      updated_at = NOW()
    WHERE id = $3;
  `, [role, is_blocked, targetId]);

  return c.json({ ok: true, message: 'اطلاعات کاربر با موفقیت به‌روزرسانی شد.' });
});

// 4b. Delete User Account (Admins can manage other admin accounts, but not their own)
adminRoutes.delete('/users/:id', async (c) => {
  const adminUser = c.get('adminUser' as never) as { id: string; role: string; phone_e164: string };
  const targetId = c.req.param('id');

  // Consistency Rule: Admins cannot delete their own account
  if (adminUser.id === targetId) {
    return c.json({ 
      error: 'SELF_DELETION_FORBIDDEN', 
      message: 'شما نمی‌توانید حساب کاربری خودتان را حذف کنید.' 
    }, 400);
  }

  // Operators cannot delete accounts
  if (adminUser.role !== 'ADMIN') {
    return c.json({ error: 'FORBIDDEN', message: 'تنها مدیر ارشد سیستم دسترسی به حذف حساب کاربری را دارد.' }, 403);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM auth_sessions WHERE user_id = $1', [targetId]);
    await client.query('DELETE FROM user_saved_prompts WHERE user_id = $1', [targetId]);
    await client.query('DELETE FROM user_copied_prompts WHERE user_id = $1', [targetId]);
    await client.query('DELETE FROM tickets WHERE user_id = $1', [targetId]);
    await client.query('DELETE FROM users WHERE id = $1', [targetId]);
    await client.query('COMMIT');
    return c.json({ ok: true, message: 'حساب کاربری با موفقیت حذف گردید.' });
  } catch (err) {
    await client.query('ROLLBACK');
    return c.json({ error: 'DB_ERROR', message: 'خطا در حذف حساب کاربری.' }, 500);
  } finally {
    client.release();
  }
});

// 5. System Settings: Get All Configs (Operators cannot view secrets)
adminRoutes.get('/settings', async (c) => {
  const adminUser = c.get('adminUser' as never) as { id: string; role: string; phone_e164: string };
  const res = await pool.query(`
    SELECT id, setting_key, setting_value, category, description_fa, updated_at
    FROM system_settings
    ORDER BY category ASC, setting_key ASC;
  `);

  if (adminUser.role === 'OPERATOR') {
    // Mask all sensitive secrets from operators
    const masked = res.rows.map((row) => {
      const val = typeof row.setting_value === 'object' && row.setting_value !== null ? { ...row.setting_value } : {};
      for (const k of Object.keys(val)) {
        if (/secret|key|token|password|auth|api/i.test(k)) {
          val[k] = '••••••••';
        }
      }
      return { ...row, setting_value: val, is_masked_for_operator: true };
    });
    return c.json(masked);
  }

  return c.json(res.rows);
});

// 6. System Settings: Update Specific Config (Operators cannot modify system settings)
const saveSystemSetting = async (c: any, keyOverride?: string) => {
  const adminUser = c.get('adminUser' as never) as { id: string; role: string; phone_e164: string };
  if (adminUser.role !== 'ADMIN') {
    return c.json({ error: 'FORBIDDEN', message: 'تنها مدیر ارشد سامانه مجاز به ویرایش تنظیمات است.' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const key = keyOverride || c.req.param('key') || body.setting_key || body.key;
  if (!key) {
    return c.json({ error: 'BAD_REQUEST', message: 'شناسه تنظیمات (setting_key) مشخص نشده است.' }, 400);
  }
  const category = body.category || 'general';
  const descFa = body.description_fa || '';

  await pool.query(`
    INSERT INTO system_settings (setting_key, category, description_fa, setting_value, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (setting_key) DO UPDATE
    SET 
      setting_value = EXCLUDED.setting_value,
      description_fa = COALESCE(NULLIF(EXCLUDED.description_fa, ''), system_settings.description_fa),
      category = COALESCE(NULLIF(EXCLUDED.category, ''), system_settings.category),
      updated_at = NOW();
  `, [key, category, descFa, JSON.stringify(body.setting_value || {})]);

  return c.json({ ok: true, message: 'تنظیمات با موفقیت ذخیره شد.' });
};

adminRoutes.put('/settings/:key', (c) => saveSystemSetting(c));
adminRoutes.post('/settings/:key', (c) => saveSystemSetting(c));
adminRoutes.post('/settings', (c) => saveSystemSetting(c));

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

// 8. List Prompts for Admin & Operators with Search, Filters, Sorting & Server Pagination
adminRoutes.get('/prompts', async (c) => {
  const q = c.req.query('q')?.trim();
  const categoryId = c.req.query('category_id');
  const modality = c.req.query('modality');
  const status = c.req.query('status'); // 'all', 'published', 'disabled'
  const tag = c.req.query('tag') || c.req.query('model');
  const sortBy = c.req.query('sort_by') || 'created_at'; // 'created_at', 'copy_count', 'view_count', 'share_count', 'slot_count', 'title_fa'
  const sortOrder = c.req.query('sort_order')?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '15', 10)));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let pIdx = 1;

  if (q) {
    conditions.push(`(p.title_fa ILIKE $${pIdx} OR p.slug ILIKE $${pIdx} OR p.search_keywords_fa ILIKE $${pIdx})`);
    params.push(`%${q}%`);
    pIdx++;
  }

  if (categoryId && categoryId !== 'all') {
    conditions.push(`p.category_id = $${pIdx++}::uuid`);
    params.push(categoryId);
  }

  if (modality && modality !== 'all') {
    conditions.push(`p.modality::text = $${pIdx++}`);
    params.push(modality);
  }

  if (tag && tag !== 'all') {
    conditions.push(`array_to_string(p.supported_models, ',') ILIKE $${pIdx++}`);
    params.push(`%${tag}%`);
  }

  if (status === 'published') {
    conditions.push(`p.is_published = true`);
  } else if (status === 'disabled') {
    conditions.push(`p.is_published = false`);
  }

  const whereClause = conditions.join(' AND ');

  const countRes = await pool.query(`
    SELECT COUNT(*) as total
    FROM prompts p
    WHERE ${whereClause};
  `, params);
  const total = parseInt(countRes.rows[0]?.total || '0', 10);

  // Validate sort field to prevent SQL injection
  const allowedSortFields: Record<string, string> = {
    created_at: 'p.created_at',
    copy_count: 'p.copy_count',
    view_count: 'p.view_count',
    share_count: 'p.share_count',
    slot_count: 'p.slot_count',
    title_fa: 'p.title_fa'
  };
  const sortColumn = allowedSortFields[sortBy] || 'p.created_at';

  const query = `
    SELECT 
      p.id, p.slug, p.title_fa, p.short_desc_fa, p.modality, p.category_id,
      c.title_fa as category_title, c.slug as category_slug,
      p.supported_models,
      p.copy_count, p.view_count, p.share_count, p.slot_count,
      p.slots_schema_json, p.is_published, p.is_admin_locked,
      p.created_at, p.updated_at
    FROM prompts p
    JOIN categories c ON p.category_id = c.id
    WHERE ${whereClause}
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT $${pIdx++} OFFSET $${pIdx++};
  `;

  const rows = await pool.query(query, [...params, limit, offset]);

  const prompts = rows.rows.map((p) => {
    const slots = Array.isArray(p.slots_schema_json) ? p.slots_schema_json : [];
    return {
      ...p,
      supported_models: Array.isArray(p.supported_models) ? p.supported_models : [],
      parameters_count: p.slot_count || slots.length,
      parameters_summary: slots.map((s: { slot_key: string; label_fa?: string; input_type?: string; is_required?: boolean }) => ({
        slot_key: s.slot_key,
        label_fa: s.label_fa || s.slot_key,
        input_type: s.input_type || 'text',
        is_required: !!s.is_required
      }))
    };
  });

  return c.json({
    prompts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1
  });
});

// 9. Toggle Prompt Published / Locked / Status / Tags
adminRoutes.patch('/prompts/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  await pool.query(`
    UPDATE prompts
    SET 
      is_published = COALESCE($1, is_published),
      is_admin_locked = COALESCE($2, is_admin_locked),
      supported_models = COALESCE($3, supported_models),
      updated_at = NOW()
    WHERE id = $4;
  `, [
    body.is_published !== undefined ? body.is_published : null,
    body.is_admin_locked !== undefined ? body.is_admin_locked : null,
    Array.isArray(body.supported_models) ? body.supported_models : null,
    id
  ]);

  return c.json({ ok: true, message: 'وضعیت پرامپت با موفقیت تغییر یافت.' });
});

// 9b. Delete Prompt Completely
adminRoutes.delete('/prompts/:id', async (c) => {
  const id = c.req.param('id');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE prompt_blocks SET source_prompt_id = NULL WHERE source_prompt_id = $1', [id]);
    await client.query('DELETE FROM user_saved_prompts WHERE prompt_id = $1', [id]);
    await client.query('DELETE FROM prompt_metrics_buffer WHERE prompt_id = $1', [id]);
    await client.query('UPDATE user_copied_prompts SET prompt_id = NULL WHERE prompt_id = $1', [id]);
    const res = await client.query('DELETE FROM prompts WHERE id = $1 RETURNING id', [id]);
    await client.query('COMMIT');

    if (res.rowCount === 0) {
      return c.json({ error: 'NOT_FOUND', message: 'پرامپت یافت نشد.' }, 404);
    }
    return c.json({ ok: true, message: 'پرامپت با موفقیت حذف گردید.' });
  } catch (err) {
    await client.query('ROLLBACK');
    return c.json({ error: 'DB_ERROR', message: 'خطا در حذف پرامپت.' }, 500);
  } finally {
    client.release();
  }
});

// 9c. Bulk Actions on Prompts (Enable, Disable, Delete)
adminRoutes.post('/prompts/bulk', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { action, ids } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'INVALID_INPUT', message: 'حداقل یک پرامپت باید انتخاب شود.' }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (action === 'enable') {
      await client.query(`
        UPDATE prompts
        SET is_published = true, updated_at = NOW()
        WHERE id = ANY($1::uuid[]);
      `, [ids]);
    } else if (action === 'disable') {
      await client.query(`
        UPDATE prompts
        SET is_published = false, updated_at = NOW()
        WHERE id = ANY($1::uuid[]);
      `, [ids]);
    } else if (action === 'set_tags') {
      const tags = Array.isArray(body.tags) ? body.tags : [];
      await client.query(`
        UPDATE prompts
        SET supported_models = $1::text[], updated_at = NOW()
        WHERE id = ANY($2::uuid[]);
      `, [tags, ids]);
    } else if (action === 'add_tag') {
      const tag = typeof body.tag === 'string' ? body.tag.trim().toLowerCase() : '';
      if (tag) {
        await client.query(`
          UPDATE prompts
          SET supported_models = array_append(array_remove(supported_models, $1), $1), updated_at = NOW()
          WHERE id = ANY($2::uuid[]);
        `, [tag, ids]);
      }
    } else if (action === 'remove_tag') {
      const tag = typeof body.tag === 'string' ? body.tag.trim().toLowerCase() : '';
      if (tag) {
        await client.query(`
          UPDATE prompts
          SET supported_models = array_remove(supported_models, $1), updated_at = NOW()
          WHERE id = ANY($2::uuid[]);
        `, [tag, ids]);
      }
    } else if (action === 'delete') {
      await client.query('UPDATE prompt_blocks SET source_prompt_id = NULL WHERE source_prompt_id = ANY($1::uuid[])', [ids]);
      await client.query('DELETE FROM user_saved_prompts WHERE prompt_id = ANY($1::uuid[])', [ids]);
      await client.query('DELETE FROM prompt_metrics_buffer WHERE prompt_id = ANY($1::uuid[])', [ids]);
      await client.query('UPDATE user_copied_prompts SET prompt_id = NULL WHERE prompt_id = ANY($1::uuid[])', [ids]);
      await client.query('DELETE FROM prompts WHERE id = ANY($1::uuid[])', [ids]);
    } else {
      await client.query('ROLLBACK');
      return c.json({ error: 'INVALID_ACTION', message: 'عملیات نامعتبر است.' }, 400);
    }

    await client.query('COMMIT');
    return c.json({ ok: true, message: `عملیات ${action} برای ${ids.length} پرامپت با موفقیت انجام شد.` });
  } catch (err) {
    await client.query('ROLLBACK');
    return c.json({ error: 'DB_ERROR', message: 'خطا در انجام عملیات گروهی.' }, 500);
  } finally {
    client.release();
  }
});

// 10. Get All Ad Network Configs
adminRoutes.get('/ad-configs', async (c) => {
  let res = await pool.query(`
    SELECT id, placement_slot, provider, zone_id, is_active, script_tag_html, target_modalities, updated_at
    FROM ad_network_configs
    ORDER BY created_at ASC;
  `);

  if (res.rows.length === 0) {
    await pool.query(`
      INSERT INTO ad_network_configs (placement_slot, provider, zone_id, is_active, script_tag_html)
      VALUES 
        ('HEADER_BANNER', 'yektanet', 'yn-slot-header', true, '<!-- Yektanet Header Banner Slot -->'),
        ('PROMPT_DETAIL_BOTTOM', 'yektanet', 'yn-slot-detail', true, '<!-- Yektanet Prompt Detail Bottom Slot -->'),
        ('POST_COPY_DRAWER', 'tapsell', 'tapsell-drawer-slot', true, '<!-- Tapsell Post Copy Drawer Slot -->')
      ON CONFLICT (placement_slot) DO NOTHING;
    `);

    res = await pool.query(`
      SELECT id, placement_slot, provider, zone_id, is_active, script_tag_html, target_modalities, updated_at
      FROM ad_network_configs
      ORDER BY created_at ASC;
    `);
  }

  return c.json(res.rows);
});

// 10.1 Update Ad Network Config
adminRoutes.put('/ad-configs/:id', async (c) => {
  const idOrSlot = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  await pool.query(`
    UPDATE ad_network_configs
    SET 
      zone_id = COALESCE($1, zone_id),
      provider = COALESCE($2, provider),
      is_active = COALESCE($3, is_active),
      script_tag_html = COALESCE($4, script_tag_html),
      updated_at = NOW()
    WHERE id::text = $5 OR placement_slot::text = $5;
  `, [body.zone_id, body.provider, body.is_active, body.script_tag_html, idOrSlot]);

  return c.json({ ok: true });
});

// 11. Clean Start / Hard Reset: Reset entire project data and state for production
adminRoutes.post('/reset-data', async (c) => {
  const adminUser = c.get('adminUser' as never) as { id: string; role: string; phone_e164: string };
  if (adminUser.role !== 'ADMIN') {
    return c.json({ error: 'FORBIDDEN', message: 'تنها مدیر ارشد سیستم اجازه پاک‌سازی کامل داده‌ها را دارد.' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const confirmation = body.confirmation;
  const resetUsers = Boolean(body.reset_users);

  if (confirmation !== 'RESET') {
    return c.json({
      error: 'CONFIRMATION_REQUIRED',
      message: 'برای تایید پاک‌سازی کامل، عبارت RESET را ارسال فرمایید.'
    }, 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Truncate operational tables with cascade
    await client.query(`
      TRUNCATE TABLE 
        prompts, 
        prompt_blocks, 
        user_saved_prompts, 
        user_copied_prompts, 
        query_embedding_cache,
        ticket_messages,
        tickets,
        ingestion_items,
        ingestion_batches,
        bulk_ingestion_jobs,
        outbox_events,
        idempotency_keys,
        otp_challenges,
        rate_limit_buckets
      RESTART IDENTITY CASCADE;
    `);

    // Truncate prompt_metrics_buffer if exists
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'prompt_metrics_buffer') THEN
          TRUNCATE TABLE prompt_metrics_buffer RESTART IDENTITY CASCADE;
        END IF;
      END $$;
    `);

    // Reset non-admin users if requested (preserving ADMIN users and their active sessions)
    if (resetUsers) {
      await client.query(`
        DELETE FROM auth_sessions 
        WHERE user_id IN (SELECT id FROM users WHERE role != 'ADMIN');
      `);
      await client.query(`
        DELETE FROM users 
        WHERE role != 'ADMIN';
      `);
    }

    await client.query('COMMIT');

    // Reset in-memory bulk ingestion manager status
    await bulkIngestionManager.hardReset().catch((e: unknown) => {
      logger.warn({ err: e }, 'Bulk ingestion manager reset error during project data reset');
    });

    // Flush Redis cache
    await redisService.flushCache().catch((e: unknown) => {
      logger.warn({ err: e }, 'Redis cache flush error during project data reset');
    });

    logger.info({ admin: adminUser.phone_e164, resetUsers }, 'Production Clean Start / Hard Reset executed successfully');

    return c.json({
      ok: true,
      message: 'کلیه داده‌ها، پرامپت‌ها، صف‌ها و حافظه کَش با موفقیت برای راه‌اندازی تمیز پاک‌سازی شدند.',
      details: {
        prompts_cleared: true,
        tickets_cleared: true,
        ingestion_jobs_cleared: true,
        caches_flushed: true,
        admin_accounts_preserved: true,
        categories_preserved: true
      }
    });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg }, 'Failed to reset project data');
    return c.json({ error: 'RESET_FAILED', message: `خطا در پاک‌سازی داده‌ها: ${msg}` }, 500);
  } finally {
    client.release();
  }
});



