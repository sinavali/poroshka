import { pool } from '../database/client.ts';
import { logger, maskPhone } from '../observability/pino-logger.ts';

export interface MeliPayamakConfig {
  provider: 'melipayamak';
  username?: string;
  password?: string;
  api_key?: string;
  pattern_id?: string | number;
  password_pattern_id?: string | number;
  sender_number?: string;
  endpoint_mode?: 'base_service' | 'console_shared';
  max_hourly_attempts?: number;
  otp_validity_seconds?: number;
}

/**
 * Retrieve SMS gateway configuration from system_settings with fallback to env variables.
 */
export async function getSmsConfig(): Promise<MeliPayamakConfig> {
  try {
    const res = await pool.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'sms_provider_config' LIMIT 1"
    );
    if (res.rows.length > 0 && res.rows[0].setting_value) {
      const val = res.rows[0].setting_value as Partial<MeliPayamakConfig>;
      return {
        provider: 'melipayamak',
        username: val.username || process.env.MELIPAYAMAK_USERNAME || '',
        password: val.password || process.env.MELIPAYAMAK_PASSWORD || '',
        api_key: val.api_key || process.env.MELIPAYAMAK_API_KEY || '',
        pattern_id: val.pattern_id || process.env.MELIPAYAMAK_PATTERN_ID || '',
        password_pattern_id: val.password_pattern_id || process.env.MELIPAYAMAK_PASSWORD_PATTERN_ID || '',
        sender_number: val.sender_number || process.env.MELIPAYAMAK_SENDER_NUMBER || '50004000',
        endpoint_mode: (val.endpoint_mode || process.env.MELIPAYAMAK_ENDPOINT_MODE || 'base_service') as 'base_service' | 'console_shared',
        max_hourly_attempts: val.max_hourly_attempts || 3,
        otp_validity_seconds: val.otp_validity_seconds || 180
      };
    }
  } catch (err) {
    logger.warn({ err }, 'Could not read sms_provider_config from system_settings, using env fallback');
  }

  return {
    provider: 'melipayamak',
    username: process.env.MELIPAYAMAK_USERNAME || '',
    password: process.env.MELIPAYAMAK_PASSWORD || '',
    api_key: process.env.MELIPAYAMAK_API_KEY || '',
    pattern_id: process.env.MELIPAYAMAK_PATTERN_ID || '',
    password_pattern_id: process.env.MELIPAYAMAK_PASSWORD_PATTERN_ID || '',
    sender_number: process.env.MELIPAYAMAK_SENDER_NUMBER || '50004000',
    endpoint_mode: (process.env.MELIPAYAMAK_ENDPOINT_MODE || 'base_service') as 'base_service' | 'console_shared',
    max_hourly_attempts: 3,
    otp_validity_seconds: 180
  };
}

/**
 * Format phone number to standard Iranian 11-digit mobile starting with 09 (MeliPayamak specification).
 */
export function formatIranianMobile(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('98') && cleaned.length >= 12) {
    cleaned = '0' + cleaned.slice(2);
  } else if (!cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

/**
 * Send OTP Verification Code using MeliPayamak Corporate "شرکتی" Pattern Mode (BaseServiceNumber).
 * This endpoint delivers instantly even to Blacklisted / Telecommunication blocked numbers.
 */
export async function sendMeliPayamakOtp(
  phoneE164: string,
  otpCode: string
): Promise<{ success: boolean; messageId?: string; simulated?: boolean; error?: string }> {
  const config = await getSmsConfig();
  const localPhone = formatIranianMobile(phoneE164);
  const masked = maskPhone(phoneE164);

  const hasBaseCreds = !!(config.username && config.password && config.pattern_id);
  const hasConsoleCreds = !!(config.api_key && config.pattern_id);

  // If credentials are not configured (e.g. fresh dev or staging without secrets), log and simulate safely
  if (!hasBaseCreds && !hasConsoleCreds) {
    logger.info(
      { phone_masked: masked, simulated: true, dev_code: otpCode },
      'MeliPayamak credentials not configured in system_settings; simulating OTP dispatch successfully'
    );
    return {
      success: true,
      simulated: true,
      messageId: `sim_${Date.now()}`
    };
  }

  // 1. Primary Corporate Mode: BaseServiceNumber (rest.payamak-panel.com)
  if (hasBaseCreds && config.endpoint_mode !== 'console_shared') {
    try {
      const url = 'https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber';
      const bodyPayload = {
        username: config.username,
        password: config.password,
        text: otpCode,
        to: localPhone,
        bodyId: Number(config.pattern_id)
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(9000)
      });

      const responseText = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(responseText) as Record<string, unknown>;
      } catch {
        data = { raw: responseText };
      }

      // Successful BaseServiceNumber returns a numeric tracking ID (> 15 digits or numeric string / object)
      const rawRecId = data?.Value || data?.recId || (typeof data?.raw === 'string' && /^\d+$/.test(data.raw.trim()) ? data.raw.trim() : null);
      const recId = rawRecId ? String(rawRecId) : null;

      if (!res.ok || (data?.RetStatus !== undefined && data.RetStatus !== 1 && data.RetStatus !== 0 && !recId)) {
        logger.error({ status: res.status, data, phone_masked: masked }, 'MeliPayamak BaseServiceNumber API rejected request');
        return { success: false, error: (data?.StrRetStatus as string) || (data?.message as string) || `MeliPayamak error code ${data?.RetStatus || res.status}` };
      }

      logger.info({ phone_masked: masked, recId: recId || 'ok' }, 'MeliPayamak Pattern OTP dispatched successfully');
      return { success: true, messageId: String(recId || Date.now()) };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err: errorMsg, phone_masked: masked }, 'MeliPayamak BaseServiceNumber network failure');
      return { success: false, error: errorMsg };
    }
  }

  // 2. Secondary Mode: Console REST (console.melipayamak.com)
  try {
    const url = `https://console.melipayamak.com/api/send/shared/${config.pattern_id}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: config.api_key,
        to: localPhone,
        args: [otpCode]
      }),
      signal: AbortSignal.timeout(9000)
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok) {
      logger.error({ status: res.status, data, phone_masked: masked }, 'MeliPayamak Console Shared API error');
      return { success: false, error: data.message || `MeliPayamak HTTP ${res.status}` };
    }

    logger.info({ phone_masked: masked, recId: data.recId }, 'MeliPayamak Console OTP dispatched successfully');
    return { success: true, messageId: String(data.recId || '') };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err: errorMsg, phone_masked: masked }, 'MeliPayamak Console Shared API failure');
    return { success: false, error: errorMsg };
  }
}

/**
 * Dispatch Randomly Generated Password to user mobile via MeliPayamak SMS.
 * If password_pattern_id is configured, uses BaseServiceNumber pattern mode;
 * otherwise uses SendSMS standard endpoint with the configured sender number.
 */
export async function sendMeliPayamakPassword(
  phoneE164: string,
  rawPassword: string
): Promise<{ success: boolean; messageId?: string; simulated?: boolean; error?: string }> {
  const config = await getSmsConfig();
  const localPhone = formatIranianMobile(phoneE164);
  const masked = maskPhone(phoneE164);

  const hasBaseCreds = !!(config.username && config.password);

  if (!hasBaseCreds && !config.api_key) {
    logger.info(
      { phone_masked: masked, simulated: true, password: rawPassword },
      'MeliPayamak credentials missing; simulated password SMS dispatch'
    );
    return {
      success: true,
      simulated: true,
      messageId: `sim_pwd_${Date.now()}`
    };
  }

  // 1. If password pattern ID is available, send via BaseServiceNumber for fast guaranteed delivery
  if (config.password_pattern_id && config.username && config.password) {
    try {
      const url = 'https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: config.username,
          password: config.password,
          text: rawPassword,
          to: localPhone,
          bodyId: Number(config.password_pattern_id)
        }),
        signal: AbortSignal.timeout(9000)
      });

      const text = await res.text();
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(text) as Record<string, unknown>; } catch { data = { raw: text }; }

      if (res.ok) {
        logger.info({ phone_masked: masked }, 'Generated credential dispatched via MeliPayamak Pattern');
        return { success: true, messageId: String(data?.Value || Date.now()) };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn({ err: errMsg }, 'MeliPayamak credential pattern failed, falling back to direct SendSMS');
    }
  }

  // 2. Direct SendSMS Endpoint
  if (config.username && config.password) {
    try {
      const url = 'https://rest.payamak-panel.com/api/SendSMS/SendSMS';
      const smsBody = `پوروشکا (Poroshka)\nکلمه عبور ورود شما به حساب کاربری: ${rawPassword}\nنام کاربری شما: ${localPhone}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: config.username,
          password: config.password,
          to: localPhone,
          from: config.sender_number || '50004000',
          text: smsBody,
          isFlash: false
        }),
        signal: AbortSignal.timeout(9000)
      });

      const responseText = await res.text();
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(responseText) as Record<string, unknown>; } catch { data = { raw: responseText }; }

      if (!res.ok) {
        logger.error({ status: res.status, data, phone_masked: masked }, 'MeliPayamak direct SendSMS error');
        return { success: false, error: (data?.StrRetStatus as string) || `MeliPayamak HTTP ${res.status}` };
      }

      logger.info({ phone_masked: masked, recId: String(data?.Value || '') }, 'Generated credential sent via MeliPayamak direct SMS');
      return { success: true, messageId: String(data?.Value || '') };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err: errorMsg, phone_masked: masked }, 'MeliPayamak direct SendSMS failed');
      return { success: false, error: errorMsg };
    }
  }

  return { success: false, error: 'SMS credentials not configured' };
}
