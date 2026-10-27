import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { catalogRoutes } from '../modules/catalog/catalog.routes.ts';
import { identityRoutes } from '../modules/identity/identity.routes.ts';
import { monetizationRoutes } from '../modules/monetization/monetization.routes.ts';
import { adminRoutes } from '../modules/admin/admin.routes.ts';
import { campaignsRoutes } from '../modules/campaigns/campaigns.routes.ts';
import { ingestionRoutes } from '../modules/ingestion/ingestion.routes.ts';
import { ticketsRoutes } from '../modules/tickets/tickets.routes.ts';
import { altchaValidator } from '../infrastructure/http-clients/altcha.validator.ts';
import { idempotencyMiddleware } from '../infrastructure/http-clients/idempotency.middleware.ts';
import { sqliteLogger } from '../infrastructure/observability/sqlite-logger.ts';
import { logger } from '../infrastructure/observability/pino-logger.ts';
import { pool } from '../infrastructure/database/client.ts';
import { redisService } from '../infrastructure/cache/redis.ts';

export function createServer(): Hono {
  const app = new Hono();

  // 1. Strict Domain-Bound CORS Configuration (Restricted to Our Own Domains Only)
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://poroshka.ir',
    'https://www.poroshka.ir',
    'https://poroshka.localme.ir',
    'http://localhost:3000',
    'http://localhost:4000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4000'
  ].filter(Boolean) as string[];

  app.use('*', cors({
    origin: (origin) => {
      if (!origin) return origin || '*'; // Allow direct server-to-server and same-origin requests
      if (process.env.NODE_ENV !== 'production') return origin;
      if (allowedOrigins.some(ao => origin === ao || origin.endsWith('.poroshka.ir') || origin.endsWith('.localme.ir'))) {
        return origin;
      }
      return null; // Reject cross-origin requests from unauthorized external sites
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Client-UUID', 'X-Idempotency-Key', 'X-Altcha-Payload'],
    exposeHeaders: ['Content-Length', 'X-RateLimit-Remaining'],
    maxAge: 86400,
    credentials: true,
  }));

  // 2. High-Performance Request Timing & Dual-Tier SQLite/Pino Logging
  app.use('*', async (c, next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const userAgent = c.req.header('user-agent') || '';
    const clientUuid = c.req.header('x-client-uuid') || '';

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    // Log to SQLite (WAL mode, fast local embedded storage)
    sqliteLogger.logRequest({
      method,
      path,
      status,
      duration_ms: duration,
      ip,
      user_agent: userAgent,
      client_uuid: clientUuid
    });

    // Structured Pino logging for non-200 or slow requests (> 300ms)
    if (status >= 400 || duration > 300) {
      logger.info({
        method,
        path,
        status,
        duration_ms: duration,
        ip
      }, 'HTTP Request Completed');
    }
  });

  // 3. Health & Readiness Probes
  app.get('/healthz', (c) => {
    return c.json({
      status: 'healthy',
      timestamp: new Date(Date.now()).toISOString(),
      uptime_seconds: Math.floor(process.uptime())
    });
  });

  app.get('/readyz', async (c) => {
    try {
      await pool.query('SELECT 1');
      const redisHealth = await redisService.checkHealth();
      return c.json({
        status: 'ready',
        database: 'connected',
        redis: redisHealth.status,
        timestamp: new Date(Date.now()).toISOString()
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return c.json({
        status: 'degraded',
        database: 'unreachable',
        error: errorMessage
      }, 503);
    }
  });

  // 4. Altcha PoW Challenge Generation Endpoint
  app.get('/api/v1/identity/altcha-challenge', (c) => {
    const challenge = altchaValidator.createChallenge();
    return c.json(challenge);
  });

  // 4b. Idempotency Middleware for Mutating API Routes
  app.use('/api/v1/*', idempotencyMiddleware);

  // 5. Mount Bounded Context Route Handlers
  app.route('/api/v1/catalog', catalogRoutes);
  app.route('/api/v1/identity', identityRoutes);
  app.route('/api/v1/monetization', monetizationRoutes);
  app.route('/api/v1/admin', adminRoutes);
  app.route('/api/v1/campaigns', campaignsRoutes);
  app.route('/api/v1/ingestion', ingestionRoutes);
  app.route('/api/v1/tickets', ticketsRoutes);

  // 6. Global 404 & Error Handlers
  app.notFound((c) => {
    return c.json({
      error: 'NOT_FOUND',
      message: 'مسیر درخواستی در سرور پوروشکا یافت نشد.',
      path: c.req.path
    }, 404);
  });

  app.onError((err, c) => {
    logger.error({ err, path: c.req.path }, 'Unhandled API Error');
    return c.json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'خطای غیرمنتظره در سرور رخ داده است. لطفاً مجدداً تلاش کنید.'
    }, 500);
  });

  return app;
}
