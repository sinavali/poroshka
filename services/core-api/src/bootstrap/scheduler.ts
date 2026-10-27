import { pool } from '../infrastructure/database/client.ts';
import { logger } from '../infrastructure/observability/pino-logger.ts';

export function startBackgroundScheduler(): () => void {
  logger.info('Starting Promptjoo background maintenance scheduler...');

  // 1. Table sweeper running every 5 minutes
  const sweeperInterval = setInterval(async () => {
    try {
      const now = new Date(Date.now()).toISOString();
      const res = await pool.query(`
        WITH del_otp AS (
          DELETE FROM otp_challenges WHERE expires_at < NOW() RETURNING id
        ),
        del_rate AS (
          DELETE FROM rate_limit_buckets WHERE expires_at < NOW() RETURNING bucket_key
        ),
        del_sessions AS (
          DELETE FROM auth_sessions WHERE expires_at < NOW() RETURNING token_hash
        ),
        del_idemp AS (
          DELETE FROM idempotency_keys WHERE expires_at < NOW() RETURNING idempotency_key
        ),
        close_tickets AS (
          UPDATE tickets SET status = 'CLOSED', updated_at = NOW()
          WHERE status != 'CLOSED' AND last_message_at < NOW() - INTERVAL '3 days'
          RETURNING id
        )
        SELECT 
          (SELECT COUNT(*) FROM del_otp) as otp_deleted,
          (SELECT COUNT(*) FROM del_rate) as rate_deleted,
          (SELECT COUNT(*) FROM del_sessions) as sessions_deleted,
          (SELECT COUNT(*) FROM del_idemp) as idemp_deleted,
          (SELECT COUNT(*) FROM close_tickets) as tickets_autoclosed;
      `);
      const counts = res.rows[0];
      if (counts && (counts.otp_deleted > 0 || counts.sessions_deleted > 0)) {
        logger.info({ counts }, 'Background sweeper purged expired records');
      }
    } catch (err) {
      logger.error({ err }, 'Error during background table sweeping');
    }
  }, 5 * 60 * 1000);

  // 2. Metrics buffer flush running every 30 seconds
  const metricsInterval = setInterval(async () => {
    try {
      // Aggregate buffer events
      const res = await pool.query(`
        WITH raw_events AS (
          DELETE FROM prompt_metrics_buffer
          RETURNING prompt_id, metric_type
        ),
        agg_events AS (
          SELECT 
            prompt_id,
            COUNT(*) FILTER (WHERE metric_type = 'COPY') as copies,
            COUNT(*) FILTER (WHERE metric_type = 'VIEW') as views,
            COUNT(*) FILTER (WHERE metric_type = 'SHARE') as shares
          FROM raw_events
          GROUP BY prompt_id
        )
        UPDATE prompts p
        SET 
          copy_count = p.copy_count + a.copies,
          view_count = p.view_count + a.views,
          share_count = p.share_count + a.shares,
          trending_score_7d = (
            ((p.copy_count + a.copies) * 3 + (p.view_count + a.views) * 1) /
            POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0 + 2, 1.5)
          )
        FROM agg_events a
        WHERE p.id = a.prompt_id;
      `);
    } catch (err) {
      logger.error({ err }, 'Error during prompt metrics buffer flushing');
    }
  }, 30 * 1000);

  return () => {
    clearInterval(sweeperInterval);
    clearInterval(metricsInterval);
    logger.info('Background scheduler stopped');
  };
}
