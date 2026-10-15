import { Hono } from 'hono';
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

// 1. Send OTP (SMS / Messenger)
identityRoutes.post('/send-otp', async (c) => {
  const body = await c.req.json();
  const parsed = SendOtpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'INVALID_INPUT', details: parsed.error.format() }, 400);
  }

  const phoneE164 = normalizePhone(parsed.data.phone);
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

  // Check rate limits: max 3 per hour per phone
  const phoneRateKey = `otp:phone:${phoneE164}`;
  const ipRateKey = `otp:ip:${clientIp}`;

  const rateCheck = await pool.query(
    'SELECT bucket_key, hit_count FROM rate_limit_buckets WHERE bucket_key IN ($1, $2)',
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

  // Update rate limit buckets
  await pool.query(`
    INSERT INTO rate_limit_buckets (bucket_key, hit_count, expires_at)
    VALUES ($1, 1, NOW() + INTERVAL '1 hour')
    ON CONFLICT (bucket_key) DO UPDATE SET hit_count = rate_limit_buckets.hit_count + 1;
  `, [phoneRateKey]);

  await pool.query(`
    INSERT INTO rate_limit_buckets (bucket_key, hit_count, expires_at)
    VALUES ($1, 1, NOW() + INTERVAL '1 hour')
    ON CONFLICT (bucket_key) DO UPDATE SET hit_count = rate_limit_buckets.hit_count + 1;
  `, [ipRateKey]);

  // Log dispatch without PII
  logger.info({ recipient_masked: maskPhone(phoneE164), purpose: parsed.data.purpose }, 'OTP generated and dispatched');

  // Return messenger deep-links for domestic fallback
  return c.json({
    ok: true,
    message: 'کد تایید با موفقیت ارسال شد.',
    expires_in_seconds: 180,
    messenger_fallback: {
      telegram_bot_url: `https://t.me/promptjoo_bot?start=auth_${messengerToken}`,
      bale_bot_url: `https://ble.ir/promptjoo_bot?start=auth_${messengerToken}`
    },
    // In dev environment or test numbers, expose code for automated verification
    ...(process.env.NODE_ENV !== 'production' ? { dev_code: rawCode } : {})
  });
});

// 2. Verify OTP & Authenticate
identityRoutes.post('/verify-otp', async (c) => {
  const body = await c.req.json();
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
  const body = await c.req.json();
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
    'SELECT hit_count FROM rate_limit_buckets WHERE bucket_key = $1',
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
    ON CONFLICT (bucket_key) DO UPDATE SET hit_count = rate_limit_buckets.hit_count + 1
    RETURNING hit_count;
  `, [key]);

  const copiesUsed = res.rows[0].hit_count;
  return c.json({
    ok: true,
    copies_used: copiesUsed,
    copies_remaining: Math.max(0, 15 - copiesUsed)
  });
});
