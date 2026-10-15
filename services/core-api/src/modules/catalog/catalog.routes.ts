import { Hono } from 'hono';
import crypto from 'node:crypto';
import { pool } from '../../infrastructure/database/client.ts';
import { detectModality, cleanSearchQuery } from '@promptjoo/persian-normalizer';
import { compilePrompt, stitchAtomicBlocks } from '@promptjoo/prompt-compiler';
import type { PromptSlot, SavedContextProfile } from '@promptjoo/contracts';

export const catalogRoutes = new Hono();

// 1. Get Categories
catalogRoutes.get('/categories', async (c) => {
  const res = await pool.query(`
    SELECT id, slug, title_fa, description_fa, icon_name, primary_modality, sort_order
    FROM categories
    WHERE is_active = true
    ORDER BY sort_order ASC;
  `);
  return c.json(res.rows);
});

// 2. List Prompts (Faceted search, filter by modality, category, trending)
catalogRoutes.get('/prompts', async (c) => {
  const modality = c.req.query('modality');
  const categorySlug = c.req.query('category');
  const search = c.req.query('q');
  const sort = c.req.query('sort') || 'trending';
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  let query = `
    SELECT 
      p.id, p.slug, p.modality, c.slug as category_slug, c.title_fa as category_title_fa,
      p.title_fa, p.short_desc_fa, p.requires_image_upload, p.supported_models,
      p.preview_after_webp_url, p.preview_before_webp_url, p.preview_blurhash,
      p.slot_count, p.copy_count, p.view_count, p.trending_score_7d, p.created_at
    FROM prompts p
    JOIN categories c ON p.category_id = c.id
    WHERE p.is_published = true
  `;
  const params: unknown[] = [];
  let paramIdx = 1;

  if (modality) {
    query += ` AND p.modality = $${paramIdx++}`;
    params.push(modality);
  }

  if (categorySlug) {
    query += ` AND c.slug = $${paramIdx++}`;
    params.push(categorySlug);
  }

  if (search && search.trim() !== '') {
    const cleaned = cleanSearchQuery(search);
    query += ` AND (p.title_fa ILIKE $${paramIdx} OR p.search_keywords_fa ILIKE $${paramIdx} OR p.template_en ILIKE $${paramIdx})`;
    params.push(`%${cleaned}%`);
    paramIdx++;
  }

  if (sort === 'copies') {
    query += ' ORDER BY p.copy_count DESC';
  } else if (sort === 'views') {
    query += ' ORDER BY p.view_count DESC';
  } else if (sort === 'newest') {
    query += ' ORDER BY p.created_at DESC';
  } else {
    query += ' ORDER BY p.trending_score_7d DESC, p.copy_count DESC';
  }

  query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  params.push(limit, offset);

  const res = await pool.query(query, params);
  return c.json({
    items: res.rows,
    page,
    limit
  });
});

// 3. Get Prompt Detail by Slug (Buffers a VIEW event)
catalogRoutes.get('/prompts/:slug', async (c) => {
  const slug = c.req.param('slug');
  const res = await pool.query(`
    SELECT 
      p.id, p.slug, p.modality, c.slug as category_slug, c.title_fa as category_title_fa,
      p.title_fa, p.short_desc_fa, p.direct_answer_summary_fa, p.search_keywords_fa,
      p.requires_image_upload, p.supported_models, p.template_en, p.slots_schema_json,
      p.faq_schema_json, p.preview_after_webp_url, p.preview_before_webp_url,
      p.preview_blurhash, p.preview_alt_fa, p.slot_count, p.copy_count, p.view_count,
      p.trending_score_7d, p.created_at
    FROM prompts p
    JOIN categories c ON p.category_id = c.id
    WHERE p.slug = $1 AND p.is_published = true;
  `, [slug]);

  if (res.rows.length === 0) {
    return c.json({ error: 'NOT_FOUND', message: 'پرامپت مورد نظر یافت نشد.' }, 404);
  }

  const prompt = res.rows[0];

  // Buffer VIEW metric event
  pool.query(`
    INSERT INTO prompt_metrics_buffer (prompt_id, metric_type)
    VALUES ($1, 'VIEW')
  `, [prompt.id]).catch(() => {});

  return c.json(prompt);
});

// 4. Compile & Copy Prompt (Buffers a COPY event)
catalogRoutes.post('/prompts/:slug/copy', async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json().catch(() => ({}));

  const res = await pool.query(
    'SELECT id, template_en, slots_schema_json, modality FROM prompts WHERE slug = $1 AND is_published = true',
    [slug]
  );

  if (res.rows.length === 0) {
    return c.json({ error: 'NOT_FOUND' }, 404);
  }

  const prompt = res.rows[0];
  const slots: PromptSlot[] = prompt.slots_schema_json || [];
  const userValues: Record<string, string> = body.slot_values || {};
  const profile: Partial<SavedContextProfile> = body.profile || {};
  const forceFarsiOutput: boolean = body.force_farsi_output ?? false;

  const compiled = compilePrompt(prompt.template_en, slots, userValues, profile, {
    forceFarsiOutput,
    modality: prompt.modality
  });

  // Buffer COPY metric event
  pool.query(`
    INSERT INTO prompt_metrics_buffer (prompt_id, metric_type)
    VALUES ($1, 'COPY')
  `, [prompt.id]).catch(() => {});

  // Persist to user_copied_prompts (tracks user copy count and saved slot values)
  const authHeader = c.req.header('authorization');
  const clientUuid = c.req.header('x-client-uuid') || '';

  (async () => {
    try {
      let userId: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const rawToken = authHeader.slice(7).trim();
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const sRes = await pool.query('SELECT user_id FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1', [tokenHash]);
        if (sRes.rows.length > 0) userId = sRes.rows[0].user_id;
      }

      if (userId) {
        await pool.query(`
          INSERT INTO user_copied_prompts (user_id, client_uuid, prompt_id, custom_values_json, compiled_text, copy_count, last_copied_at)
          VALUES ($1, $2, $3, $4, $5, 1, NOW())
          ON CONFLICT (user_id, prompt_id) DO UPDATE SET
            copy_count = user_copied_prompts.copy_count + 1,
            custom_values_json = EXCLUDED.custom_values_json,
            compiled_text = EXCLUDED.compiled_text,
            last_copied_at = NOW();
        `, [userId, clientUuid || null, prompt.id, JSON.stringify(userValues), compiled.compiledText]);
      } else if (clientUuid) {
        await pool.query(`
          INSERT INTO user_copied_prompts (client_uuid, prompt_id, custom_values_json, compiled_text, copy_count, last_copied_at)
          VALUES ($1, $2, $3, $4, 1, NOW())
          ON CONFLICT (client_uuid, prompt_id) DO UPDATE SET
            copy_count = user_copied_prompts.copy_count + 1,
            custom_values_json = EXCLUDED.custom_values_json,
            compiled_text = EXCLUDED.compiled_text,
            last_copied_at = NOW();
        `, [clientUuid, prompt.id, JSON.stringify(userValues), compiled.compiledText]);
      }
    } catch {}
  })();

  return c.json({
    compiled_text: compiled.compiledText,
    resolved_slot_values: compiled.resolvedSlotValues,
    missing_required_slots: compiled.missingRequiredSlots
  });
});

// 5. Zero-LLM Atomic Block Forging
catalogRoutes.post('/forge', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const queryText = (body.query || '').trim();
  if (!queryText) {
    return c.json({ error: 'BAD_REQUEST', message: 'متن ایده یا دستور پرامپت الزامی است.' }, 400);
  }
  const forcedModality = body.modality;
  const profile: Partial<SavedContextProfile> = body.profile || {};

  // Detect modality
  const detected = forcedModality || detectModality(queryText).modality;

  // Retrieve top atomic blocks for this modality
  // If vectors are available, we use cosine distance; otherwise grab top-used blocks
  const blocksRes = await pool.query(`
    SELECT DISTINCT ON (block_type)
      block_type, title_fa, block_template_en, slots_schema_json
    FROM prompt_blocks
    WHERE modality = $1
    ORDER BY block_type, usage_count DESC;
  `, [detected]);

  if (blocksRes.rows.length === 0) {
    return c.json({
      error: 'NO_BLOCKS_FOUND',
      message: 'بلوک‌های سازنده پرامپت برای این دسته‌بندی هنوز بارگذاری نشده است.'
    }, 404);
  }

  let roleText = '';
  let taskText = '';
  let constraintText = '';
  let formatText = '';
  const mergedSlots: PromptSlot[] = [];

  for (const block of blocksRes.rows) {
    if (block.block_type === 'ROLE') roleText = block.block_template_en;
    if (block.block_type === 'TASK') taskText = block.block_template_en;
    if (block.block_type === 'CONSTRAINT') constraintText = block.block_template_en;
    if (block.block_type === 'FORMAT') formatText = block.block_template_en;

    if (Array.isArray(block.slots_schema_json)) {
      for (const slot of block.slots_schema_json) {
        if (!mergedSlots.some(s => s.slot_key === slot.slot_key)) {
          mergedSlots.push(slot);
        }
      }
    }
  }

  const stitchedTemplate = stitchAtomicBlocks({
    role: roleText,
    task: taskText || queryText,
    constraint: constraintText,
    format: formatText
  });

  const compiled = compilePrompt(stitchedTemplate, mergedSlots, body.slot_values || {}, profile, {
    forceFarsiOutput: body.force_farsi_output ?? false,
    modality: detected
  });

  return c.json({
    modality: detected,
    stitched_template: stitchedTemplate,
    compiled_text: compiled.compiledText,
    slots: mergedSlots,
    resolved_slot_values: compiled.resolvedSlotValues
  });
});
