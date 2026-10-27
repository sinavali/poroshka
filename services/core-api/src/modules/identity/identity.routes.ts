import { Hono, type Context } from 'hono';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { pool } from '../../infrastructure/database/client.ts';
import { logger, maskPhone } from '../../infrastructure/observability/pino-logger.ts';
import { altchaValidator } from '../../infrastructure/http-clients/altcha.validator.ts';
import {
  SendOtpRequestSchema,
  VerifyOtpRequestSchema,
  PasswordLoginRequestSchema,
  UpdateProfileRequestSchema
} from '@promptjoo/contracts';
import { sendMeliPayamakOtp, sendMeliPayamakPassword } from '../../infrastructure/sms/melipayamak.client.ts';

export const identityRoutes = new Hono();

// Helper to normalize phone numbers to E.164 (+98...)
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('09')) {
    cleaned = '98' + cleaned.slice(1);
  } else if (cleaned.startsWith('9') && cleaned.length === 10) {
    cleaned = '98' + cleaned;
  }
  return '+' + cleaned;
}

// 1. Send / Request OTP (SMS / Messenger)
const handleOtpRequest = async (c: Context) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = SendOtpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'INVALID_INPUT', details: parsed.error.format() }, 400);
  }

  // Validate Altcha PoW verification
  const altchaPayload = parsed.data.altcha_payload || c.req.header('x-altcha-payload');
  if (altchaPayload) {
    const isValid = await altchaValidator.verify(altchaPayload);
    if (!isValid) {
      return c.json({ error: 'INVALID_CAPTCHA', message: 'اعتبارسنجی کپچای امنیتی ناموفق بود. لطفاً صفحه را مجدداً بارگذاری کنید.' }, 400);
    }
  } else if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'MISSING_CAPTCHA', message: 'ارسال کپچای امنیتی الزامی است.' }, 400);
  }

  const phoneE164 = normalizePhone(parsed.data.phone);
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

  // Check rate limits: max 3 per hour per phone
  const phoneRateKey = `otp:phone:${phoneE164}`;
  const ipRateKey = `otp:ip:${clientIp}`;

  const rateCheck = await pool.query(
    'SELECT bucket_key, hit_count FROM rate_limit_buckets WHERE bucket_key IN ($1, $2) AND expires_at > NOW()',
    [phoneRateKey, ipRateKey]
  );

  for (const row of rateCheck.rows) {
    if (row.bucket_key === phoneRateKey && row.hit_count >= 3) {
      return c.json({ error: 'TOO_MANY_REQUESTS', message: 'حداکثر ۳ کد تایید در هر ساعت مجاز است. لطفاً کمی صبر کنید.' }, 429);
    }
    if (row.bucket_key === ipRateKey && row.hit_count >= 5) {
      return c.json({ error: 'TOO_MANY_REQUESTS', message: 'درخواست‌های بیش از حد از این IP ثبت شده است.' }, 429);
    }
  }

  // Generate 5-digit OTP
  const rawCode = Math.floor(10000 + Math.random() * 90000).toString();
  const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
  const messengerToken = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

  // Insert OTP challenge
  await pool.query(
    `INSERT INTO otp_challenges (phone_e164, purpose, code_hash, messenger_token, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [phoneE164, parsed.data.purpose, codeHash, messengerToken, expiresAt]
  );

  // Update rate limit buckets with window reset support
  await pool.query(`
    INSERT INTO rate_limit_buckets (bucket_key, hit_count, expires_at)
    VALUES ($1, 1, NOW() + INTERVAL '1 hour')
    ON CONFLICT (bucket_key) DO UPDATE SET 
      hit_count = CASE WHEN rate_limit_buckets.expires_at <= NOW() THEN 1 ELSE rate_limit_buckets.hit_count + 1 END,
      expires_at = CASE WHEN rate_limit_buckets.expires_at <= NOW() THEN EXCLUDED.expires_at ELSE rate_limit_buckets.expires_at END;
  `, [phoneRateKey]);

  await pool.query(`
    INSERT INTO rate_limit_buckets (bucket_key, hit_count, expires_at)
    VALUES ($1, 1, NOW() + INTERVAL '1 hour')
    ON CONFLICT (bucket_key) DO UPDATE SET 
      hit_count = CASE WHEN rate_limit_buckets.expires_at <= NOW() THEN 1 ELSE rate_limit_buckets.hit_count + 1 END,
      expires_at = CASE WHEN rate_limit_buckets.expires_at <= NOW() THEN EXCLUDED.expires_at ELSE rate_limit_buckets.expires_at END;
  `, [ipRateKey]);

  // Dispatch OTP via MeliPayamak official REST API
  const smsResult = await sendMeliPayamakOtp(phoneE164, rawCode);
  logger.info({
    recipient_masked: maskPhone(phoneE164),
    purpose: parsed.data.purpose,
    sms_success: smsResult.success,
    simulated: smsResult.simulated
  }, 'OTP generated and dispatched');

  return c.json({
    ok: true,
    message: smsResult.success ? 'کد تایید با موفقیت ارسال شد.' : 'کد تایید صادر شد (ارسال پیامک با تاخیر مواجه شد).',
    expires_in_seconds: 180,
    sms_delivered: smsResult.success,
    // Strictly restrict dev_code to development environment
    ...(process.env.NODE_ENV === 'development' ? { dev_code: rawCode } : {})
  });
};

identityRoutes.post('/send-otp', handleOtpRequest);
identityRoutes.post('/request-otp', handleOtpRequest);

// 1b. Request Random Password Generated & Sent via SMS
const handlePasswordRequest = async (c: Context) => {
  const body = await c.req.json().catch(() => ({}));
  const phone = body.phone;
  if (!phone || typeof phone !== 'string') {
    return c.json({ error: 'INVALID_INPUT', message: 'شماره تلفن همراه الزامی است.' }, 400);
  }

  // Validate Altcha PoW verification
  const altchaPayload = body.altcha_payload || c.req.header('x-altcha-payload');
  if (altchaPayload) {
    const isValid = await altchaValidator.verify(altchaPayload);
    if (!isValid) {
      return c.json({ error: 'INVALID_CAPTCHA', message: 'اعتبارسنجی کپچای امنیتی ناموفق بود. لطفاً صفحه را مجدداً بارگذاری کنید.' }, 400);
    }
  } else if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'MISSING_CAPTCHA', message: 'ارسال کپچای امنیتی الزامی است.' }, 400);
  }

  const phoneE164 = normalizePhone(phone);
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

  // Strict rate limit: max 3 requests per hour
  const phoneRateKey = `pwd:phone:${phoneE164}`;
  const ipRateKey = `pwd:ip:${clientIp}`;

  const rateCheck = await pool.query(
    'SELECT bucket_key, hit_count FROM rate_limit_buckets WHERE bucket_key IN ($1, $2) AND expires_at > NOW()',
    [phoneRateKey, ipRateKey]
  );

  for (const row of rateCheck.rows) {
    if (row.bucket_key === phoneRateKey && row.hit_count >= 3) {
      return c.json({ error: 'TOO_MANY_REQUESTS', message: 'حداکثر ۳ درخواست رمز عبور در هر ساعت مجاز است. لطفاً کمی صبر کنید.' }, 429);
    }
    if (row.bucket_key === ipRateKey && row.hit_count >= 5) {
      return c.json({ error: 'TOO_MANY_REQUESTS', message: 'درخواست‌های بیش از حد از این IP ثبت شده است.' }, 429);
    }
  }

  // Generate strong random readable password (e.g., Psh + 6 digits/letters)
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let randomSuffix = '';
  const randomBytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    randomSuffix += charset[randomBytes[i] % charset.length];
  }
  const generatedPassword = `Psh#${randomSuffix}`;
  const passwordHash = await argon2.hash(generatedPassword);

  // Upsert user and store password hash
  await pool.query(`
    INSERT INTO users (phone_e164, password_hash, is_phone_verified, role)
    VALUES ($1, $2, true, 'USER')
    ON CONFLICT (phone_e164) DO UPDATE 
    SET password_hash = $2, updated_at = NOW();
  `, [phoneE164, passwordHash]);

  // Update rate limit buckets with window reset support
  await pool.query(`
    INSERT INTO rate_limit_buckets (bucket_key, hit_count, expires_at)
    VALUES ($1, 1, NOW() + INTERVAL '1 hour')
    ON CONFLICT (bucket_key) DO UPDATE SET 
      hit_count = CASE WHEN rate_limit_buckets.expires_at <= NOW() THEN 1 ELSE rate_limit_buckets.hit_count + 1 END,
      expires_at = CASE WHEN rate_limit_buckets.expires_at <= NOW() THEN EXCLUDED.expires_at ELSE rate_limit_buckets.expires_at END;
  `, [phoneRateKey]);
  await pool.query(`
    INSERT INTO rate_limit_buckets (bucket_key, hit_count, expires_at)
    VALUES ($1, 1, NOW() + INTERVAL '1 hour')
    ON CONFLICT (bucket_key) DO UPDATE SET 
      hit_count = CASE WHEN rate_limit_buckets.expires_at <= NOW() THEN 1 ELSE rate_limit_buckets.hit_count + 1 END,
      expires_at = CASE WHEN rate_limit_buckets.expires_at <= NOW() THEN EXCLUDED.expires_at ELSE rate_limit_buckets.expires_at END;
  `, [ipRateKey]);

  // Send generated password via MeliPayamak
  const smsRes = await sendMeliPayamakPassword(phoneE164, generatedPassword);

  logger.info({
    recipient_masked: maskPhone(phoneE164),
    sms_success: smsRes.success,
    simulated: smsRes.simulated
  }, 'Random password generated and dispatched via SMS');

  return c.json({
    ok: true,
    message: smsRes.success ? 'کلمه عبور جدید با موفقیت به شماره موبایل شما پیامک شد.' : 'کلمه عبور ایجاد شد اما ارسال پیامک با تاخیر مواجه شد.',
    sms_delivered: smsRes.success,
    ...(process.env.NODE_ENV === 'development' ? { dev_password: generatedPassword } : {})
  });
};

identityRoutes.post('/request-password', handlePasswordRequest);
identityRoutes.post('/send-password', handlePasswordRequest);

// 2. Verify OTP & Authenticate
identityRoutes.post('/verify-otp', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = VerifyOtpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'INVALID_INPUT', details: parsed.error.format() }, 400);
  }

  const phoneE164 = normalizePhone(parsed.data.phone);
  const codeHash = crypto.createHash('sha256').update(parsed.data.code).digest('hex');

  // Verify challenge
  const res = await pool.query(
    `SELECT id, attempts FROM otp_challenges
     WHERE phone_e164 = $1 AND purpose = $2 AND is_consumed = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [phoneE164, parsed.data.purpose]
  );

  if (res.rows.length === 0) {
    return c.json({ error: 'EXPIRED_OR_INVALID', message: 'کد تایید منقضی شده یا وجود ندارد.' }, 400);
  }

  const challenge = res.rows[0];
  if (challenge.attempts >= 4) {
    return c.json({ error: 'TOO_MANY_ATTEMPTS', message: 'تعداد دفعات اشتباه بیش از حد مجاز است. لطفاً کد جدید دریافت کنید.' }, 429);
  }

  // Check code match
  const matchCheck = await pool.query(
    'SELECT id FROM otp_challenges WHERE id = $1 AND code_hash = $2',
    [challenge.id, codeHash]
  );

  if (matchCheck.rows.length === 0) {
    const incrementQuery = 'UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1';
    await pool.query(incrementQuery, [challenge.id]);
    return c.json({ error: 'INVALID_CODE', message: 'کد تایید وارد شده صحیح نیست.' }, 400);
  }

  // Mark consumed
  await pool.query('UPDATE otp_challenges SET is_consumed = true WHERE id = $1', [challenge.id]);

  // Upsert user
  const userRes = await pool.query(`
    INSERT INTO users (phone_e164, is_phone_verified, role)
    VALUES ($1, true, 'USER')
    ON CONFLICT (phone_e164) DO UPDATE SET is_phone_verified = true, last_login_at = NOW()
    RETURNING id, phone_e164, is_phone_verified, role, saved_context_profile_json;
  `, [phoneE164]);

  const user = userRes.rows[0];

  // Issue 30-day persistent session
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();

  await pool.query(`
    INSERT INTO auth_sessions (token_hash, user_id, device_label, ip_address, expires_at)
    VALUES ($1, $2, $3, $4, $5)
  `, [tokenHash, user.id, parsed.data.device_label || 'Web/Mobile Client', clientIp || null, expiresAt]);

  return c.json({
    token: rawToken,
    session_token: rawToken,
    expires_at: expiresAt.toISOString(),
    user: {
      id: user.id,
      phone_e164: user.phone_e164,
      is_phone_verified: user.is_phone_verified,
      role: user.role,
      saved_context_profile_json: user.saved_context_profile_json
    }
  });
});

// 3. Password Login (Optional secondary flow)
identityRoutes.post('/login-password', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = PasswordLoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'INVALID_INPUT', details: parsed.error.format() }, 400);
  }

  const phoneE164 = normalizePhone(parsed.data.phone);
  const res = await pool.query(
    'SELECT id, phone_e164, password_hash, is_phone_verified, role, saved_context_profile_json FROM users WHERE phone_e164 = $1',
    [phoneE164]
  );

  if (res.rows.length === 0 || !res.rows[0].password_hash) {
    return c.json({ error: 'INVALID_CREDENTIALS', message: 'شماره یا رمز عبور اشتباه است، یا رمزی برای این حساب تعیین نشده است.' }, 400);
  }

  const user = res.rows[0];
  const valid = await argon2.verify(user.password_hash, parsed.data.password);
  if (!valid) {
    return c.json({ error: 'INVALID_CREDENTIALS', message: 'شماره یا رمز عبور اشتباه است.' }, 400);
  }

  // Issue session
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();

  await pool.query(`
    INSERT INTO auth_sessions (token_hash, user_id, device_label, ip_address, expires_at)
    VALUES ($1, $2, $3, $4, $5)
  `, [tokenHash, user.id, parsed.data.device_label || 'Password Login', clientIp || null, expiresAt]);

  return c.json({
    token: rawToken,
    session_token: rawToken,
    expires_at: expiresAt.toISOString(),
    user: {
      id: user.id,
      phone_e164: user.phone_e164,
      is_phone_verified: user.is_phone_verified,
      role: user.role,
      saved_context_profile_json: user.saved_context_profile_json
    }
  });
});

// 4. Anonymous Quota Check (Client UUID + IP Subnet hybrid)
identityRoutes.post('/quota/check-anonymous', async (c) => {
  const clientUuid = c.req.header('x-client-uuid');
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

  // Extract /24 subnet for IP (protects mobile CGNAT)
  const ipParts = clientIp.split('.');
  const ipSubnet = ipParts.length === 4 ? `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0` : clientIp;

  const key = `quota:anon:${clientUuid || ipSubnet}`;
  const res = await pool.query(
    'SELECT hit_count FROM rate_limit_buckets WHERE bucket_key = $1 AND expires_at > NOW()',
    [key]
  );

  const copiesUsed = res.rows.length > 0 ? res.rows[0].hit_count : 0;
  const remaining = Math.max(0, 15 - copiesUsed);

  return c.json({
    allowed: remaining > 0,
    daily_quota: 15,
    copies_used: copiesUsed,
    copies_remaining: remaining,
    requires_login: remaining === 0
  });
});

// 5. Consume Anonymous Copy Quota
identityRoutes.post('/quota/consume-anonymous', async (c) => {
  const clientUuid = c.req.header('x-client-uuid');
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const ipParts = clientIp.split('.');
  const ipSubnet = ipParts.length === 4 ? `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0` : clientIp;

  const key = `quota:anon:${clientUuid || ipSubnet}`;

  const res = await pool.query(`
    INSERT INTO rate_limit_buckets (bucket_key, hit_count, expires_at)
    VALUES ($1, 1, NOW() + INTERVAL '24 hours')
    ON CONFLICT (bucket_key) DO UPDATE SET 
      hit_count = CASE WHEN rate_limit_buckets.expires_at <= NOW() THEN 1 ELSE rate_limit_buckets.hit_count + 1 END,
      expires_at = CASE WHEN rate_limit_buckets.expires_at <= NOW() THEN EXCLUDED.expires_at ELSE rate_limit_buckets.expires_at END
    RETURNING hit_count;
  `, [key]);

  const copiesUsed = res.rows[0].hit_count;
  return c.json({
    ok: true,
    copies_used: copiesUsed,
    copies_remaining: Math.max(0, 15 - copiesUsed)
  });
});

// 6. User Copied Prompts Archive (Used Prompts with Counter)
// 6. User Copied Prompts Archive (Used Prompts with Counter, Category & Server Pagination)
identityRoutes.get('/copied-prompts', async (c) => {
  const authHeader = c.req.header('authorization');
  const clientUuid = c.req.header('x-client-uuid') || '';
  let userId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7).trim();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const sRes = await pool.query('SELECT user_id FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1', [tokenHash]);
    if (sRes.rows.length > 0) userId = sRes.rows[0].user_id;
  }

  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(60, Math.max(1, parseInt(c.req.query('limit') || '12', 10)));
  const offset = (page - 1) * limit;
  const q = c.req.query('q')?.trim();
  const modality = c.req.query('modality');
  const categoryId = c.req.query('category_id');

  const conditions: string[] = [
    '(($1::uuid IS NOT NULL AND (ucp.user_id = $1::uuid OR (ucp.client_uuid IS NOT NULL AND ucp.client_uuid = $2))) OR ($1::uuid IS NULL AND ucp.client_uuid = $2))',
    '(p.id IS NULL OR p.is_ai_enriched = true)'
  ];
  const params: unknown[] = [userId, clientUuid];
  let pIdx = 3;

  if (q) {
    conditions.push(`(
      COALESCE(p.title_fa, ucp.custom_title_fa) ILIKE $${pIdx} OR 
      COALESCE(p.short_desc_fa, '') ILIKE $${pIdx} OR
      ucp.compiled_text ILIKE $${pIdx}
    )`);
    params.push(`%${q}%`);
    pIdx++;
  }

  if (modality && modality !== 'all') {
    conditions.push(`COALESCE(p.modality::text, ucp.custom_modality) = $${pIdx}`);
    params.push(modality);
    pIdx++;
  }

  if (categoryId && categoryId !== 'all') {
    conditions.push(`(COALESCE(ucp.custom_category_id, p.category_id) = $${pIdx}::uuid)`);
    params.push(categoryId);
    pIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const countQuery = `
    SELECT COUNT(*) as total
    FROM user_copied_prompts ucp
    LEFT JOIN prompts p ON ucp.prompt_id = p.id
    WHERE ${whereClause};
  `;

  const countRes = await pool.query(countQuery, params);
  const total = parseInt(countRes.rows[0]?.total || '0', 10);

  const query = `
    SELECT 
      ucp.id, ucp.copy_count, ucp.custom_values_json, ucp.compiled_text, ucp.last_copied_at,
      COALESCE(p.id, ucp.id) as prompt_id,
      COALESCE(p.slug, '') as slug,
      COALESCE(p.title_fa, ucp.custom_title_fa, 'پرامپت ساخته‌شده') as title_fa,
      COALESCE(p.short_desc_fa, '') as short_desc_fa,
      COALESCE(p.modality::text, ucp.custom_modality, 'text_writing') as modality,
      COALESCE(cust_cat.id, c.id) as category_id,
      COALESCE(cust_cat.slug, c.slug, '') as category_slug,
      COALESCE(cust_cat.title_fa, c.title_fa, 'تولید محتوا و مهندسی پرامپت') as category_title_fa,
      (ucp.custom_category_id IS NOT NULL) as is_custom_category
    FROM user_copied_prompts ucp
    LEFT JOIN prompts p ON ucp.prompt_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN categories cust_cat ON ucp.custom_category_id = cust_cat.id
    WHERE ${whereClause}
    ORDER BY ucp.last_copied_at DESC
    LIMIT $${pIdx++} OFFSET $${pIdx++};
  `;

  const dataParams = [...params, limit, offset];
  const rows = await pool.query(query, dataParams);

  return c.json({
    items: rows.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1
  });
});

// 6b. Remove Copied Prompt from User's Archive
identityRoutes.delete('/copied-prompts/:id', async (c) => {
  const id = c.req.param('id');
  const authHeader = c.req.header('authorization');
  const clientUuid = c.req.header('x-client-uuid') || '';
  let userId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7).trim();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const sRes = await pool.query('SELECT user_id FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1', [tokenHash]);
    if (sRes.rows.length > 0) userId = sRes.rows[0].user_id;
  }

  const res = await pool.query(`
    DELETE FROM user_copied_prompts
    WHERE id = $1 AND (
      ($2::uuid IS NOT NULL AND (user_id = $2::uuid OR (client_uuid IS NOT NULL AND client_uuid = $3))) OR
      ($2::uuid IS NULL AND client_uuid = $3)
    )
    RETURNING id;
  `, [id, userId, clientUuid]);

  if (res.rowCount === 0) {
    return c.json({ error: 'NOT_FOUND', message: 'پرامپت مورد نظر یافت نشد یا دسترسی حذف ندارید.' }, 404);
  }

  return c.json({ ok: true, message: 'پرامپت با موفقیت از آرشیو شما حذف شد.' });
});

// 6c. Change User Scope Category for a Copied Prompt
identityRoutes.patch('/copied-prompts/:id', async (c) => {
  const id = c.req.param('id');
  const authHeader = c.req.header('authorization');
  const clientUuid = c.req.header('x-client-uuid') || '';
  let userId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7).trim();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const sRes = await pool.query('SELECT user_id FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1', [tokenHash]);
    if (sRes.rows.length > 0) userId = sRes.rows[0].user_id;
  }

  const body = await c.req.json().catch(() => ({}));
  const { category_id } = body;

  const res = await pool.query(`
    UPDATE user_copied_prompts
    SET custom_category_id = $1
    WHERE id = $2 AND (
      ($3::uuid IS NOT NULL AND (user_id = $3::uuid OR (client_uuid IS NOT NULL AND client_uuid = $4))) OR
      ($3::uuid IS NULL AND client_uuid = $4)
    )
    RETURNING id, custom_category_id;
  `, [category_id || null, id, userId, clientUuid]);

  if (res.rowCount === 0) {
    return c.json({ error: 'NOT_FOUND', message: 'پرامپت مورد نظر یافت نشد یا دسترسی ویرایش ندارید.' }, 404);
  }

  return c.json({ ok: true, message: 'دسته‌بندی اختصاصی پرامپت با موفقیت به‌روزرسانی شد.' });
});

// 7. Record Copied Prompt (Direct API for forged prompts & custom copies)
identityRoutes.post('/copied-prompts', async (c) => {
  const authHeader = c.req.header('authorization');
  const clientUuid = c.req.header('x-client-uuid') || '';
  let userId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7).trim();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const sRes = await pool.query('SELECT user_id FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1', [tokenHash]);
    if (sRes.rows.length > 0) userId = sRes.rows[0].user_id;
  }

  const body = await c.req.json().catch(() => ({}));
  const { prompt_id, title_fa, modality, custom_values_json = {}, compiled_text = '' } = body;

  if (!compiled_text && !prompt_id) {
    return c.json({ error: 'INVALID_INPUT', message: 'متن پرامپت یا شناسه پرامپت الزامی است.' }, 400);
  }

  try {
    if (prompt_id) {
      if (userId) {
        await pool.query(`
          INSERT INTO user_copied_prompts (user_id, client_uuid, prompt_id, custom_values_json, compiled_text, copy_count, last_copied_at)
          VALUES ($1, $2, $3, $4, $5, 1, NOW())
          ON CONFLICT (user_id, prompt_id) WHERE user_id IS NOT NULL AND prompt_id IS NOT NULL
          DO UPDATE SET
            copy_count = user_copied_prompts.copy_count + 1,
            custom_values_json = EXCLUDED.custom_values_json,
            compiled_text = EXCLUDED.compiled_text,
            last_copied_at = NOW();
        `, [userId, clientUuid || null, prompt_id, JSON.stringify(custom_values_json), compiled_text]);
      } else if (clientUuid) {
        await pool.query(`
          INSERT INTO user_copied_prompts (client_uuid, prompt_id, custom_values_json, compiled_text, copy_count, last_copied_at)
          VALUES ($1, $2, $3, $4, 1, NOW())
          ON CONFLICT (client_uuid, prompt_id) WHERE user_id IS NULL AND prompt_id IS NOT NULL
          DO UPDATE SET
            copy_count = user_copied_prompts.copy_count + 1,
            custom_values_json = EXCLUDED.custom_values_json,
            compiled_text = EXCLUDED.compiled_text,
            last_copied_at = NOW();
        `, [clientUuid, prompt_id, JSON.stringify(custom_values_json), compiled_text]);
      }
    } else {
      // Custom forged prompt without catalog prompt_id
      const existing = await pool.query(`
        SELECT id, copy_count FROM user_copied_prompts
        WHERE compiled_text = $1 AND (($2::uuid IS NOT NULL AND user_id = $2::uuid) OR ($2::uuid IS NULL AND client_uuid = $3))
        LIMIT 1;
      `, [compiled_text, userId, clientUuid]);

      if (existing.rows.length > 0) {
        await pool.query(`
          UPDATE user_copied_prompts
          SET copy_count = copy_count + 1,
              custom_values_json = $1,
              custom_title_fa = COALESCE($2, custom_title_fa),
              last_copied_at = NOW()
          WHERE id = $3;
        `, [JSON.stringify(custom_values_json), title_fa || 'پرامپت ساخته‌شده', existing.rows[0].id]);
      } else {
        await pool.query(`
          INSERT INTO user_copied_prompts (user_id, client_uuid, custom_title_fa, custom_modality, custom_values_json, compiled_text, copy_count, last_copied_at)
          VALUES ($1, $2, $3, $4, $5, $6, 1, NOW());
        `, [userId, clientUuid || null, title_fa || 'پرامپت ساخته‌شده', modality || 'text_writing', JSON.stringify(custom_values_json), compiled_text]);
      }
    }

    return c.json({ ok: true, message: 'پرامپت در آرشیو ثبت شد.' });
  } catch (err) {
    logger.error({ err }, 'Failed to record copied prompt');
    return c.json({ ok: false }, 500);
  }
});

// 8. User Profile & Saved Memory Profiles
identityRoutes.get('/profile', async (c) => {
  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED' }, 401);
  }

  const rawToken = authHeader.slice(7).trim();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const res = await pool.query(`
    SELECT u.id, u.phone_e164, u.role, u.saved_context_profile_json
    FROM auth_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.is_blocked = false
    LIMIT 1;
  `, [tokenHash]);

  if (res.rows.length === 0) {
    return c.json({ error: 'UNAUTHORIZED' }, 401);
  }

  const user = res.rows[0];
  return c.json({
    user_id: user.id,
    phone_e164: user.phone_e164,
    role: user.role,
    saved_context_profile_json: user.saved_context_profile_json || {}
  });
});

// 9. Update User Profile & Memory Profiles
identityRoutes.patch('/profile', async (c) => {
  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED' }, 401);
  }

  const rawToken = authHeader.slice(7).trim();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const sRes = await pool.query(`
    SELECT user_id FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1
  `, [tokenHash]);

  if (sRes.rows.length === 0) {
    return c.json({ error: 'UNAUTHORIZED' }, 401);
  }

  const userId = sRes.rows[0].user_id;
  const body = await c.req.json().catch(() => ({}));
  const profileData = body.saved_context_profile_json ?? body;

  await pool.query(`
    UPDATE users
    SET saved_context_profile_json = $1, updated_at = NOW()
    WHERE id = $2;
  `, [JSON.stringify(profileData), userId]);

  return c.json({
    ok: true,
    message: 'اطلاعات پروفایل و حافظه شخصی با موفقیت ذخیره شد.',
    saved_context_profile_json: profileData
  });
});
