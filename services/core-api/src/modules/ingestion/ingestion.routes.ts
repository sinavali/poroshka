import { Hono } from 'hono';
import crypto from 'node:crypto';
import { pool } from '../../infrastructure/database/client.ts';
import { logger } from '../../infrastructure/observability/pino-logger.ts';
import { detectModality } from '../../../../../packages/persian-normalizer/src/index.ts';

export const ingestionRoutes = new Hono();

// 1. Create Ingestion Batch
ingestionRoutes.post('/batches', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { batch_name, source_filename, max_budget_usd = 5.0 } = body;

  if (!batch_name || !source_filename) {
    return c.json({ error: 'INVALID_INPUT', message: 'نام بچ و نام فایل الزامی است.' }, 400);
  }

  const res = await pool.query(`
    INSERT INTO ingestion_batches (batch_name, source_filename, max_budget_usd)
    VALUES ($1, $2, $3)
    RETURNING id, batch_name, source_filename, created_at
  `, [batch_name, source_filename, max_budget_usd]);

  return c.json(res.rows[0], 201);
});

// 2. Upload Prompt Items to Batch
ingestionRoutes.post('/batches/:id/upload', async (c) => {
  const batchId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const items: Array<{
    raw_template_en: string;
    title_fa?: string;
    category_slug?: string;
    metadata?: Record<string, unknown>;
  }> = body.items || [];

  if (!Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'INVALID_INPUT', message: 'لیست پرامپت‌ها خالی است.' }, 400);
  }

  const client = await pool.connect();
  let inserted = 0;
  let skippedDuplicates = 0;

  try {
    await client.query('BEGIN');

    // Get current row count for batch
    const countRes = await client.query(
      'SELECT COALESCE(MAX(row_index), 0) as max_idx FROM ingestion_items WHERE batch_id = $1',
      [batchId]
    );
    let currentRowIdx = parseInt(countRes.rows[0].max_idx, 10);

    for (const item of items) {
      currentRowIdx++;
      const template = item.raw_template_en?.trim();
      if (!template) continue;

      const hash = crypto.createHash('sha256').update(template).digest('hex');

      // Check exact duplicate in prompts table
      const exactCheck = await client.query(
        'SELECT id FROM prompts WHERE content_hash = $1 LIMIT 1',
        [hash]
      );

      if (exactCheck.rows.length > 0) {
        skippedDuplicates++;
        await client.query(`
          INSERT INTO ingestion_items (
            batch_id, row_index, content_hash, raw_template_en, status, raw_metadata_json
          ) VALUES ($1, $2, $3, $4, 'SKIPPED_DUPLICATE', $5)
          ON CONFLICT (batch_id, row_index) DO NOTHING;
        `, [batchId, currentRowIdx, hash, template, JSON.stringify(item.metadata || {})]);
        continue;
      }

      // Check near-duplicate using pg_trgm similarity > 0.93
      const nearCheck = await client.query(`
        SELECT id, similarity(template_en, $1) as sim 
        FROM prompts 
        WHERE similarity(template_en, $1) > 0.93 
        LIMIT 1;
      `, [template]);

      if (nearCheck.rows.length > 0) {
        skippedDuplicates++;
        await client.query(`
          INSERT INTO ingestion_items (
            batch_id, row_index, content_hash, raw_template_en, status, raw_metadata_json
          ) VALUES ($1, $2, $3, $4, 'SKIPPED_NEAR_DUPLICATE', $5)
          ON CONFLICT (batch_id, row_index) DO NOTHING;
        `, [batchId, currentRowIdx, hash, template, JSON.stringify(item.metadata || {})]);
        continue;
      }

      // Detect modality
      const detected = detectModality(item.title_fa || template);

      await client.query(`
        INSERT INTO ingestion_items (
          batch_id, row_index, content_hash, raw_template_en, detected_modality, status, raw_metadata_json
        ) VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
        ON CONFLICT (batch_id, row_index) DO NOTHING;
      `, [batchId, currentRowIdx, hash, template, detected.modality, JSON.stringify(item.metadata || {})]);
      inserted++;
    }

    // Update batch stats
    await client.query(`
      UPDATE ingestion_batches 
      SET total_rows = total_rows + $1, skipped_duplicates = skipped_duplicates + $2
      WHERE id = $3
    `, [items.length, skippedDuplicates, batchId]);

    await client.query('COMMIT');
    return c.json({
      batch_id: batchId,
      total_uploaded: items.length,
      inserted,
      skipped_duplicates: skippedDuplicates
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, batchId }, 'Failed to upload batch items');
    return c.json({ error: 'BATCH_UPLOAD_FAILED' }, 500);
  } finally {
    client.release();
  }
});

// 3. Get Batch Status
ingestionRoutes.get('/batches/:id', async (c) => {
  const batchId = c.req.param('id');
  const batchRes = await pool.query(
    'SELECT * FROM ingestion_batches WHERE id = $1',
    [batchId]
  );

  if (batchRes.rows.length === 0) {
    return c.json({ error: 'NOT_FOUND' }, 404);
  }

  const itemsStats = await pool.query(`
    SELECT status, COUNT(*) as count 
    FROM ingestion_items 
    WHERE batch_id = $1 
    GROUP BY status;
  `, [batchId]);

  return c.json({
    batch: batchRes.rows[0],
    items_breakdown: itemsStats.rows
  });
});

// 4. Export JSONL Snapshot of Published Prompts
ingestionRoutes.get('/export/snapshot', async (c) => {
  const res = await pool.query(`
    SELECT 
      p.slug, p.modality, c.slug as category_slug, p.title_fa, p.short_desc_fa,
      p.direct_answer_summary_fa, p.search_keywords_fa, p.template_en,
      p.slots_schema_json, p.faq_schema_json, p.copy_count, p.view_count
    FROM prompts p
    JOIN categories c ON p.category_id = c.id
    WHERE p.is_published = true
    ORDER BY p.copy_count DESC;
  `);

  const lines = res.rows.map(r => JSON.stringify(r)).join('\n');
  return new Response(lines, {
    headers: {
      'Content-Type': 'application/x-jsonlines',
      'Content-Disposition': 'attachment; filename="promptjoo-catalog-snapshot.jsonl"'
    }
  });
});
