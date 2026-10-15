import { pool } from '../database/client.ts';
import { logger, maskPhone } from '../observability/pino-logger.ts';

export interface MeliPayamakConfig {
  provider: string;
  api_key?: string;
  username?: string;
  password?: string;
  pattern_id?: string | number;
  endpoint_type?: 'console_rest' | 'service_rest';
  sender_number?: string;
  max_hourly_attempts?: number;
  otp_validity_seconds?: number;
}

export async function getSmsConfig(): Promise<MeliPayamakConfig> {
  try {
    const res = await pool.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'sms_provider_config' LIMIT 1"
    );
    if (res.rows.length > 0 && res.rows[0].setting_value) {
      return res.rows[0].setting_value as MeliPayamakConfig;
    }
  } catch (err) {
    logger.warn({ err }, 'Could not read sms_provider_config from system_settings, using env fallback');
  }

  return {
    provider: 'melipayamak',
    api_key: process.env.MELIPAYAMAK_API_KEY || '',
    username: process.env.MELIPAYAMAK_USERNAME || '',
    password: process.env.MELIPAYAMAK_PASSWORD || '',
    pattern_id: process.env.MELIPAYAMAK_PATTERN_ID || '',
    endpoint_type: (process.env.MELIPAYAMAK_ENDPOINT_TYPE as 'console_rest' | 'service_rest') || 'console_rest',
    sender_number: process.env.MELIPAYAMAK_SENDER_NUMBER || '',
    max_hourly_attempts: 3,
    otp_validity_seconds: 180
  };
}

export async function sendMeliPayamakOtp(
  phoneE164: string,
  otpCode: string
): Promise<{ success: boolean; messageId?: string; simulated?: boolean; error?: string }> {
  const config = await getSmsConfig();
  
  // Format to standard Iranian mobile starting with 09 (MeliPayamak requirement)
  let localPhone = phoneE164.replace(/\D/g, '');
  if (localPhone.startsWith('98')) {
    localPhone = '0' + localPhone.slice(2);
  } else if (!localPhone.startsWith('0')) {
    localPhone = '0' + localPhone;
  }

  const masked = maskPhone(phoneE164);

  // If no credentials configured or in local dev without real keys, simulate successfully
  const hasConsoleCreds = !!(config.api_key && config.pattern_id);
  const hasServiceCreds = !!(config.username && config.password && config.pattern_id);

  if (!hasConsoleCreds && !hasServiceCreds) {
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

  // 1. New Console REST API (console.melipayamak.com)
  if (config.endpoint_type === 'console_rest' || (config.api_key && !config.username)) {
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
        signal: AbortSignal.timeout(8000)
      });

      const data = (await res.json().catch(() => ({}))) as Record<string, any>;
      if (!res.ok) {
        logger.error({ status: res.status, data, phone_masked: masked }, 'MeliPayamak Console API error');
        return { success: false, error: data.message || `MeliPayamak HTTP ${res.status}` };
      }

      logger.info({ phone_masked: masked, recId: data.recId }, 'MeliPayamak Console OTP dispatched');
      return { success: true, messageId: String(data.recId || '') };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err: errorMsg, phone_masked: masked }, 'MeliPayamak Console API network timeout/failure');
      return { success: false, error: errorMsg };
    }
  }

  // 2. Standard Service REST API (rest.payamak-service.net)
  try {
    const url = 'https://rest.payamak-service.net/api/v1/sms/send/pattern';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: config.username,
        password: config.password,
        to: localPhone,
        bodyId: Number(config.pattern_id),
        text: otpCode
      }),
      signal: AbortSignal.timeout(8000)
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok || (data.retStatus && data.retStatus !== 1)) {
      logger.error({ status: res.status, data, phone_masked: masked }, 'MeliPayamak Service API error');
      return { success: false, error: data.StrRetStatus || `MeliPayamak HTTP ${res.status}` };
    }

    logger.info({ phone_masked: masked, recId: data.Value }, 'MeliPayamak Service OTP dispatched');
    return { success: true, messageId: String(data.Value || '') };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err: errorMsg, phone_masked: masked }, 'MeliPayamak Service API network failure');
    return { success: false, error: errorMsg };
  }
}
