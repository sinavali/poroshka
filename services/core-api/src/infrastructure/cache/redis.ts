import { Redis, type RedisOptions } from 'ioredis';
import { logger } from '../observability/pino-logger.ts';

const REDIS_URL = process.env.REDIS_URL;
const DISABLE_REDIS = process.env.DISABLE_REDIS === 'true' || process.env.ENABLE_REDIS === 'false';

// 60 minutes minimum keep-open retention after last use
const IDLE_CONNECTION_RETENTION_MS = 60 * 60 * 1000;

class RedisService {
  private client: Redis | null = null;
  private isAvailable = false;
  private hasReportedInitialConnect = false;
  private lastUsedAt = Date.now();
  private idleCheckTimer: NodeJS.Timeout | null = null;

  constructor() {
    if (DISABLE_REDIS) {
      logger.info('Redis explicitly disabled via DISABLE_REDIS; operating in zero-Redis PostgreSQL fallback mode');
      return;
    }

    this.ensureConnection();
  }

  private ensureConnection(): void {
    if (this.client) {
      this.lastUsedAt = Date.now();
      return;
    }

    if (!REDIS_URL) {
      logger.info('REDIS_URL not configured; operating in zero-Redis PostgreSQL fallback mode');
      return;
    }

    try {
      const options: RedisOptions = {
        maxRetriesPerRequest: null, // Allow queuing during reconnection
        connectTimeout: 10000,
        commandTimeout: 5000,
        keepAlive: 30000, // 30s TCP keep-alive to prevent remote gateway drops
        enableOfflineQueue: true,
        keyPrefix: 'promptjoo:',
        lazyConnect: false,
        reconnectOnError(err: Error) {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        },
        retryStrategy(times: number) {
          // Exponential backoff capped at 5 seconds; persistently keep trying
          return Math.min(times * 1000, 5000);
        }
      };

      this.client = new Redis(REDIS_URL, options);

      this.client.on('connect', () => {
        this.isAvailable = true;
        this.lastUsedAt = Date.now();
        if (!this.hasReportedInitialConnect) {
          this.hasReportedInitialConnect = true;
          logger.info('Connected to Redis cache cluster (Persistent Keep-Alive active)');
        }
      });

      this.client.on('ready', () => {
        this.isAvailable = true;
        this.lastUsedAt = Date.now();
      });

      this.client.on('error', () => {
        this.isAvailable = false;
        // Keep quiet on remote transient reconnects to avoid polluting terminal logs
      });

      this.client.on('close', () => {
        this.isAvailable = false;
      });

      // Periodically verify idle retention (only terminate if inactive for 60+ minutes)
      this.idleCheckTimer = setInterval(() => {
        const idleTime = Date.now() - this.lastUsedAt;
        if (idleTime > IDLE_CONNECTION_RETENTION_MS && this.client) {
          logger.info({ idleMinutes: Math.round(idleTime / 60000) }, 'Redis idle for over 60 minutes; gently closing socket');
          this.client.disconnect();
          this.client = null;
          this.isAvailable = false;
        }
      }, 5 * 60 * 1000);
      if (this.idleCheckTimer.unref) {
        this.idleCheckTimer.unref();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ msg }, 'Failed to initialize Redis client');
    }
  }

  public get isConnected(): boolean {
    return this.isAvailable && this.client !== null && this.client.status === 'ready';
  }

  public async checkHealth(): Promise<{ ok: boolean; status: string; latencyMs?: number }> {
    if (!this.client) {
      return { ok: true, status: 'disabled or idle (PostgreSQL fallback active)' };
    }
    this.lastUsedAt = Date.now();
    const start = Date.now();
    try {
      await this.client.ping();
      const latencyMs = Date.now() - start;
      return { ok: true, status: 'connected', latencyMs };
    } catch {
      return { ok: false, status: 'reconnecting' };
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    this.ensureConnection();
    if (!this.client || !this.isAvailable) return null;
    this.lastUsedAt = Date.now();
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    this.ensureConnection();
    if (!this.client || !this.isAvailable) return;
    this.lastUsedAt = Date.now();
    try {
      const str = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await this.client.set(key, str, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, str);
      }
    } catch {}
  }

  public async del(key: string): Promise<void> {
    this.ensureConnection();
    if (!this.client || !this.isAvailable) return;
    this.lastUsedAt = Date.now();
    try {
      await this.client.del(key);
    } catch {}
  }

  public async incrRateLimit(key: string, windowSeconds = 60): Promise<{ count: number; ttl: number }> {
    this.ensureConnection();
    if (!this.client || !this.isAvailable) {
      return { count: 1, ttl: windowSeconds };
    }
    this.lastUsedAt = Date.now();
    try {
      const multi = this.client.multi();
      multi.incr(key);
      multi.ttl(key);
      const results = await multi.exec();
      const count = (results?.[0]?.[1] as number) || 1;
      let ttl = (results?.[1]?.[1] as number) || -1;
      if (ttl === -1) {
        await this.client.expire(key, windowSeconds);
        ttl = windowSeconds;
      }
      return { count, ttl };
    } catch {
      return { count: 1, ttl: windowSeconds };
    }
  }

  public async flushCache(): Promise<void> {
    this.ensureConnection();
    if (!this.client || !this.isAvailable) return;
    this.lastUsedAt = Date.now();
    try {
      const keys = await this.client.keys('*');
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (err: unknown) {
      logger.warn({ err }, 'Failed to flush redis cache');
    }
  }

  public async close(force = true): Promise<void> {
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
      this.idleCheckTimer = null;
    }

    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      } finally {
        this.client = null;
        this.isAvailable = false;
      }
    }
  }
}

export const redisService = new RedisService();
