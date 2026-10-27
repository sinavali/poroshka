import { Hono } from 'hono';
import { pool } from '../../infrastructure/database/client.ts';

export const adminAdConfigsRoutes = new Hono();

// 1. Get All Ad Network Configs
adminAdConfigsRoutes.get('/ad-configs', async (c) => {
  let res = await pool.query(`
    SELECT id, placement_slot, provider, zone_id, is_active, script_tag_html, target_modalities, updated_at
    FROM ad_network_configs
    ORDER BY created_at ASC;
  `);

  if (res.rows.length === 0) {
    await pool.query(`
      INSERT INTO ad_network_configs (placement_slot, provider, zone_id, is_active, script_tag_html)
      VALUES 
        ('FEED_NATIVE_CARD_3', 'yektanet', 'yn-slot-feed', true, '<!-- Yektanet Feed Native Slot -->'),
        ('STICKY_FOOTER_BANNER', 'yektanet', 'yn-slot-sticky', true, '<!-- Yektanet Sticky Footer Slot -->'),
        ('POST_COPY_DRAWER', 'tapsell', 'tapsell-drawer-slot', true, '<!-- Tapsell Post Copy Drawer Slot -->')
      ON CONFLICT (placement_slot) DO NOTHING;
    `);

    res = await pool.query(`
      SELECT id, placement_slot, provider, zone_id, is_active, script_tag_html, target_modalities, updated_at
      FROM ad_network_configs
      ORDER BY created_at ASC;
    `);
  }

  return c.json(res.rows);
});

// 2. Update Ad Network Config
adminAdConfigsRoutes.put('/ad-configs/:id', async (c) => {
  const idOrSlot = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  await pool.query(`
    UPDATE ad_network_configs
    SET 
      zone_id = COALESCE($1, zone_id),
      provider = COALESCE($2, provider),
      is_active = COALESCE($3, is_active),
      script_tag_html = COALESCE($4, script_tag_html),
      updated_at = NOW()
    WHERE id::text = $5 OR placement_slot::text = $5;
  `, [body.zone_id, body.provider, body.is_active, body.script_tag_html, idOrSlot]);

  return c.json({ ok: true });
});
