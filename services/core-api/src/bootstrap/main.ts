import { serve } from '@hono/node-server';
import { createServer } from './server.ts';
import { startBackgroundScheduler } from './scheduler.ts';
import { startOutboxWorker, stopOutboxWorker } from '../modules/campaigns/campaigns.routes.ts';
import { logger } from '../infrastructure/observability/pino-logger.ts';
import { pool } from '../infrastructure/database/client.ts';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = createServer();

// Start background runners
const stopScheduler = startBackgroundScheduler();
startOutboxWorker(5000);

const server = serve({
  fetch: app.fetch,
  port: PORT,
  hostname: HOST
}, (info) => {
  logger.info({
    port: info.port,
    host: HOST,
    env: process.env.NODE_ENV || 'development'
  }, `🚀 Promptjoo Core API listening at http://${HOST}:${PORT}`);
});

// Graceful Shutdown Handler
function shutdown(signal: string) {
  logger.info({ signal }, 'Graceful shutdown initiated...');
  stopScheduler();
  stopOutboxWorker();

  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await pool.end();
      logger.info('Database pool drained.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during database pool shutdown');
      process.exit(1);
    }
  });

  // Force close after 10s if stuck
  setTimeout(() => {
    logger.warn('Forcing process shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error({ err: err?.message, stack: err?.stack }, 'Uncaught Exception safely trapped in Core API');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Rejection safely trapped in Core API');
});

