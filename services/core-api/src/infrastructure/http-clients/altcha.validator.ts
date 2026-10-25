import crypto from 'node:crypto';

let ephemeralHmacSecret: string | null = null;

function getHmacSecret(): string {
  const secret = process.env.ALTCHA_HMAC_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (!ephemeralHmacSecret) {
      ephemeralHmacSecret = crypto.randomBytes(32).toString('hex');
    }
    return ephemeralHmacSecret;
  }
  return secret;
}

export interface AltchaPayload {
  algorithm: string;
  challenge: string;
  number: number;
  salt: string;
  signature: string;
}

export const altchaValidator = {
  createChallenge(): { challenge: string; salt: string; signature: string } {
    const salt = crypto.randomBytes(12).toString('hex');
    const secretTarget = Math.floor(Math.random() * 50000) + 1000;
    const challenge = crypto.createHash('sha256').update(salt + secretTarget).digest('hex');
    const signature = crypto.createHmac('sha256', getHmacSecret()).update(challenge).digest('hex');
    return { challenge, salt, signature };
  },

  verify(payloadBase64?: string): boolean {
    if (!payloadBase64) return false;
    try {
      const decoded = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const payload: AltchaPayload = JSON.parse(decoded);

      // Verify HMAC signature of challenge
      const expectedSignature = crypto.createHmac('sha256', getHmacSecret()).update(payload.challenge).digest('hex');
      if (expectedSignature !== payload.signature) {
        return false;
      }

      // Verify PoW solution
      const computedChallenge = crypto.createHash('sha256').update(payload.salt + payload.number).digest('hex');
      return computedChallenge === payload.challenge;
    } catch {
      return false;
    }
  }
};
