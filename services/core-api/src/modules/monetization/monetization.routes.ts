import { Hono } from 'hono';
import { pool } from '../../infrastructure/database/client.ts';
import { AdClickEventSchema } from '@promptjoo/contracts';
import { sqliteLogger } from '../../infrastructure/observability/sqlite-logger.ts';

export const monetizationRoutes = new Hono();

// 1. Get Active Ad Network Configurations (Yektanet / Tapsell)
monetizationRoutes.get('/configs', async (c) => {
  const slot = c.req.query('slot');
  let query = 'SELECT id, placement_slot, provider, zone_id, script_tag_html, target_modalities FROM ad_network_configs WHERE is_active = true';
  const params: unknown[] = [];

  if (slot) {
    query += ' AND placement_slot = $1';
    params.push(slot);
  }

  const res = await pool.query(query, params);
  return c.json(res.rows);
});

monetizationRoutes.get('/active-units', async (c) => {
  const res = await pool.query('SELECT id, placement_slot, provider, zone_id, script_tag_html, target_modalities FROM ad_network_configs WHERE is_active = true');
  return c.json(res.rows);
});

// 2. Track Ad Click with Fraud Deduplication
monetizationRoutes.post('/events/click', async (c) => {
  const body = await c.req.json();
  const parsed = AdClickEventSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'INVALID_INPUT' }, 400);
  }

  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'unknown';

  // Check 10-minute cooldown rate limit to prevent click fraud
  const cooldownKey = `ad:click:${parsed.data.placement_slot}:${parsed.data.client_uuid}`;
  const check = await pool.query(
    'SELECT hit_count FROM rate_limit_buckets WHERE bucket_key = $1',
    [cooldownKey]
  );

  if (check.rows.length > 0 && check.rows[0].hit_count > 1) {
    // Debounced, ignore spam click
    return c.json({ ok: true, deduplicated: true });
  }

  // Set 10-minute cooldown
  await pool.query(`
    INSERT INTO rate_limit_buckets (bucket_key, hit_count, expires_at)
    VALUES ($1, 1, NOW() + INTERVAL '10 minutes')
    ON CONFLICT (bucket_key) DO UPDATE SET hit_count = rate_limit_buckets.hit_count + 1;
  `, [cooldownKey]);

  // Record audit trace in local SQLite
  sqliteLogger.logSecurityEvent({
    event_type: 'AD_CLICK',
    severity: 'INFO',
    ip: clientIp,
    actor_id: parsed.data.client_uuid,
    details: {
      slot: parsed.data.placement_slot,
      provider: parsed.data.provider,
      zone_id: parsed.data.zone_id,
      userAgent
    }
  });

  return c.json({ ok: true, deduplicated: false });
});
