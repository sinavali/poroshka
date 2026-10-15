import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-relay-secret"]',
      '*.password',
      '*.password_hash',
      '*.code',
      '*.otp',
      '*.token',
      '*.token_hash',
      '*.phone_e164'
    ],
    censor: '[REDACTED]'
  },
  formatters: {
    level(label) {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return '***';
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}
