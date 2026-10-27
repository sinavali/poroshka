import { Hono, type Context } from 'hono';
import crypto from 'node:crypto';
import { pool } from '../../infrastructure/database/client.ts';
import { bulkIngestionManager } from './bulk-ingestion.service.ts';
import {
  getLlmConfig,
  saveLlmConfig,
  testLlmConnection,
  type LlmProviderConfig
} from './llm-enricher.service.ts';

export const bulkIngestionRoutes = new Hono();

// Authentication middleware: Admin or Operator access
bulkIngestionRoutes.use('*', async (c, next) => {
  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED', message: 'توکن دسترسی معتبر نیست.' }, 401);
  }

  const rawToken = authHeader.slice(7).trim();
  if (process.env.SUPERADMIN_TOKEN && rawToken === process.env.SUPERADMIN_TOKEN) {
    c.set('userRole' as never, 'ADMIN');
    return next();
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const userCheck = await pool.query(`
    SELECT u.id, u.role
    FROM auth_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.is_blocked = false;
  `, [tokenHash]);

  if (userCheck.rows.length === 0) {
    return c.json({ error: 'UNAUTHORIZED', message: 'نشست کاربری نامعتبر است.' }, 401);
  }

  const role = userCheck.rows[0].role;
  if (role !== 'ADMIN' && role !== 'OPERATOR') {
    return c.json({ error: 'FORBIDDEN', message: 'دسترسی فقط برای مدیران و اپراتورها مجاز است.' }, 403);
  }

  c.set('userRole' as never, role);
  await next();
});

// 1. Get Live Ingestion Status & Metrics
bulkIngestionRoutes.get('/status', async (c) => {
  const status = await bulkIngestionManager.getStatus();
  return c.json(status);
});

// 2. Start Background Ingestion
bulkIngestionRoutes.post('/start', async (c) => {
  const role = c.get('userRole' as never);
  if (role === 'OPERATOR') {
    return c.json({ error: 'FORBIDDEN', message: 'اپراتورها دسترسی به اجرای موتور پردازش هوش مصنوعی را ندارند.' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const status = await bulkIngestionManager.start({
    batch_size: typeof body.batch_size === 'number' ? body.batch_size : undefined,
    delay_ms: typeof body.delay_ms === 'number' ? body.delay_ms : undefined
  });
  return c.json(status);
});

// 3. Pause Background Ingestion
bulkIngestionRoutes.post('/pause', async (c) => {
  const role = c.get('userRole' as never);
  if (role === 'OPERATOR') {
    return c.json({ error: 'FORBIDDEN', message: 'اپراتورها دسترسی به توقف موتور پردازش را ندارند.' }, 403);
  }

  const status = await bulkIngestionManager.pause();
  return c.json(status);
});

// 4. Resume Background Ingestion
bulkIngestionRoutes.post('/resume', async (c) => {
  const role = c.get('userRole' as never);
  if (role === 'OPERATOR') {
    return c.json({ error: 'FORBIDDEN', message: 'اپراتورها دسترسی به ادامه موتور پردازش را ندارند.' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const status = await bulkIngestionManager.resume({
    batch_size: typeof body.batch_size === 'number' ? body.batch_size : undefined,
    delay_ms: typeof body.delay_ms === 'number' ? body.delay_ms : undefined
  });
  return c.json(status);
});

// 5. Stop Background Ingestion
bulkIngestionRoutes.post('/stop', async (c) => {
  const role = c.get('userRole' as never);
  if (role === 'OPERATOR') {
    return c.json({ error: 'FORBIDDEN', message: 'اپراتورها دسترسی به لغو موتور پردازش را ندارند.' }, 403);
  }

  const status = await bulkIngestionManager.stop();
  return c.json(status);
});

// 6. Get Current LLM Provider Configuration
const handleGetConfig = async (c: Context) => {
  const role = c.get('userRole' as never);
  const config = await getLlmConfig();

  if (!config) {
    return c.json({
      provider: 'custom',
      api_key: '',
      base_url: '',
      model: 'custom-model',
      temperature: 0.2,
      max_tokens: 4000,
      timeout_seconds: 60,
      is_active: false
    });
  }

  // If Operator, mask sensitive API key
  if (role === 'OPERATOR' && config.api_key) {
    return c.json({
      ...config,
      api_key: '••••••••',
      is_masked: true
    });
  }

  return c.json(config);
};
bulkIngestionRoutes.get('/config', handleGetConfig);
bulkIngestionRoutes.get('/llm-config', handleGetConfig);

// 7. Save LLM Provider Configuration (Superadmin only)
const handleSaveConfig = async (c: Context) => {
  const role = c.get('userRole' as never);
  if (role !== 'ADMIN') {
    return c.json({ error: 'FORBIDDEN', message: 'تنها مدیر ارشد مجاز به ذخیره تنظیمات هوش مصنوعی است.' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const provider = body.provider || 'custom';
  const model = body.model || 'custom-model';

  const newConfig: LlmProviderConfig = {
    provider,
    api_key: String(body.api_key || '').trim(),
    base_url: String(body.base_url || '').trim(),
    model: String(model).trim(),
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.2,
    max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 4000,
    timeout_seconds: typeof body.timeout_seconds === 'number' && body.timeout_seconds > 0 ? body.timeout_seconds : 60,
    is_active: body.is_active !== undefined ? Boolean(body.is_active) : true
  };

  await saveLlmConfig(newConfig);
  return c.json({ ok: true, message: 'تنظیمات موتور هوش مصنوعی با موفقیت ذخیره شد.', config: newConfig });
};
bulkIngestionRoutes.post('/config', handleSaveConfig);
bulkIngestionRoutes.post('/llm-config', handleSaveConfig);

// 8. Test LLM Connection (Live Verification)
bulkIngestionRoutes.post('/test-connection', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const activeConfig = await getLlmConfig();

  const testConfig: LlmProviderConfig = {
    provider: body.provider || activeConfig?.provider || 'custom',
    api_key: body.api_key !== undefined ? String(body.api_key).trim() : (activeConfig?.api_key || ''),
    base_url: body.base_url !== undefined ? String(body.base_url).trim() : (activeConfig?.base_url || ''),
    model: body.model || activeConfig?.model || 'custom-model',
    temperature: typeof body.temperature === 'number' ? body.temperature : (activeConfig?.temperature ?? 0.2),
    max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : (activeConfig?.max_tokens ?? 500),
    timeout_seconds: typeof body.timeout_seconds === 'number' ? body.timeout_seconds : (activeConfig?.timeout_seconds ?? 30),
    is_active: true
  };

  const result = await testLlmConnection(testConfig);
  return c.json(result);
});

// 9. Hard Reset: Delete All Prompts (Admin Only)
bulkIngestionRoutes.post('/hard-reset', async (c) => {
  const role = c.get('userRole' as never);
  if (role !== 'ADMIN') {
    return c.json({ error: 'FORBIDDEN', message: 'تنها مدیر ارشد مجاز به حذف کامل کاتالوگ است.' }, 403);
  }

  const status = await bulkIngestionManager.hardReset();
  return c.json({
    ok: true,
    message: 'تمام پرامپت‌ها با موفقیت حذف شدند و کاتالوگ بازنشانی شد.',
    status
  });
});

// 10. Hard Ingest: Re-ingest All Prompts from Scratch (Admin Only)
bulkIngestionRoutes.post('/hard-ingest', async (c) => {
  const role = c.get('userRole' as never);
  if (role !== 'ADMIN') {
    return c.json({ error: 'FORBIDDEN', message: 'تنها مدیر ارشد مجاز به غنی‌سازی مجدد کلی است.' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const status = await bulkIngestionManager.hardIngest({
    batch_size: typeof body.batch_size === 'number' ? body.batch_size : undefined,
    delay_ms: typeof body.delay_ms === 'number' ? body.delay_ms : undefined
  });

  return c.json({
    ok: true,
    message: 'تمام پرامپت‌ها برای غنی‌سازی مجدد در صف قرار گرفتند.',
    status
  });
});

