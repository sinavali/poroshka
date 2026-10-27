import crypto from 'node:crypto';
import { redisService } from '../cache/redis.ts';

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
  expires_at?: number;
}

export const altchaValidator = {
  createChallenge(expiresInSeconds = 300): { challenge: string; salt: string; signature: string; expires_at: number } {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const salt = `${crypto.randomBytes(12).toString('hex')}?expires=${expiresAt}`;
    const secretTarget = Math.floor(Math.random() * 50000) + 1000;
    const challenge = crypto.createHash('sha256').update(salt + secretTarget).digest('hex');
    const signature = crypto.createHmac('sha256', getHmacSecret()).update(challenge).digest('hex');
    return { challenge, salt, signature, expires_at: expiresAt };
  },

  async verify(payloadBase64?: string): Promise<boolean> {
    if (!payloadBase64) return false;
    try {
      const decoded = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const payload: AltchaPayload = JSON.parse(decoded);

      // 1. Verify HMAC signature of challenge
      const expectedSignature = crypto.createHmac('sha256', getHmacSecret()).update(payload.challenge).digest('hex');
      if (expectedSignature !== payload.signature) {
        return false;
      }

      // 2. Verify PoW solution
      const computedChallenge = crypto.createHash('sha256').update(payload.salt + payload.number).digest('hex');
      if (computedChallenge !== payload.challenge) {
        return false;
      }

      // 3. Verify timestamp expiration (expires_at strictly bound to authenticated salt)
      const nowSec = Math.floor(Date.now() / 1000);
      const match = payload.salt.match(/[?&]expires=(\d+)/);
      if (!match) {
        return false;
      }
      const expiresAt = parseInt(match[1], 10);
      if (Number.isNaN(expiresAt) || nowSec > expiresAt) {
        return false;
      }
      if (payload.expires_at && payload.expires_at !== expiresAt) {
        return false;
      }

      // 4. Redis replay prevention (SET altcha:<hash> 1 EX 300 NX)
      const challengeHash = crypto.createHash('sha256').update(payload.challenge).digest('hex');
      const notReplayed = await redisService.setIfNotExists(`altcha:${challengeHash}`, '1', 300);
      if (!notReplayed) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
};
