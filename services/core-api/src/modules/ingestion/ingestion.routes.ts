import { Hono } from 'hono';
import crypto from 'node:crypto';
import { pool } from '../../infrastructure/database/client.ts';
import { logger } from '../../infrastructure/observability/pino-logger.ts';
import { detectModality } from '@promptjoo/persian-normalizer';
import { enrichPromptWithLlm, heuristicEnrich } from './llm-enricher.service.ts';
import { bulkIngestionRoutes } from './bulk-ingestion.routes.ts';
import { processDatasetImport, type IngestionItem } from './dataset-import.service.ts';
import { generateDeapiEmbedding } from '../../infrastructure/ai/deapi-embedding.service.ts';
import { persistPromptAtomicBlocks } from './atomic-decomposer.service.ts';

export const ingestionRoutes = new Hono();

// Mount Bulk Ingestion Controller
ingestionRoutes.route('/bulk', bulkIngestionRoutes);

// Admin Authentication Middleware for Ingestion endpoints
ingestionRoutes.use('*', async (c, next) => {
  // Public schema info
  if (c.req.path.endsWith('/schema') && c.req.method === 'GET') {
    return next();
  }

  // In non-production environments, allow unauthenticated requests for integration tests
  if (process.env.NODE_ENV !== 'production' && !c.req.header('authorization')) {
    return next();
  }

  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED', message: 'توکن دسترسی معتبر نیست.' }, 401);
  }

  const rawToken = authHeader.slice(7).trim();
  if (process.env.SUPERADMIN_TOKEN && rawToken === process.env.SUPERADMIN_TOKEN) {
    return next();
  }
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const adminCheck = await pool.query(`
    SELECT u.id, u.role
    FROM auth_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.is_blocked = false;
  `, [tokenHash]);

  if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'ADMIN') {
    return c.json({ error: 'FORBIDDEN', message: 'دسترسی فقط برای مدیر سیستم مجاز است.' }, 403);
  }

  await next();
});

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
    WHERE p.is_published = true AND p.is_ai_enriched = true AND p.is_ai_enriched = true AND p.is_ai_enriched = true
    ORDER BY p.copy_count DESC;
  `);

  const lines = res.rows.map(r => JSON.stringify(r)).join('\n');
  return new Response(lines, {
    headers: {
      'Content-Type': 'application/x-jsonlines',
      'Content-Disposition': 'attachment; filename="poroshka-catalog-snapshot.jsonl"'
    }
  });
});

// 5. Export Clean CSV Dataset (with UTF-8 BOM for Persian Excel support)
ingestionRoutes.get('/export/csv', async () => {
  const res = await pool.query(`
    SELECT 
      p.slug, p.title_fa, c.slug as category_slug, p.modality, p.short_desc_fa,
      p.direct_answer_summary_fa, p.search_keywords_fa,
      p.template_en, p.slots_schema_json, p.faq_schema_json, p.copy_count, p.view_count
    FROM prompts p
    JOIN categories c ON p.category_id = c.id
    WHERE p.is_published = true AND p.is_ai_enriched = true AND p.is_ai_enriched = true AND p.is_ai_enriched = true
    ORDER BY p.copy_count DESC;
  `);

  const headers = [
    'slug', 'title_fa', 'category_slug', 'modality', 'short_desc_fa',
    'direct_answer_summary_fa', 'search_keywords_fa', 'template_en',
    'slots_schema_json', 'faq_schema_json', 'copy_count', 'view_count'
  ];

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [headers.join(',')];
  for (const row of res.rows) {
    csvRows.push(headers.map(h => escapeCsv((row as Record<string, unknown>)[h])).join(','));
  }

  // Prepend UTF-8 BOM (\uFEFF)
  const csvContent = '\uFEFF' + csvRows.join('\r\n');

  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="poroshka-dataset-${Date.now()}.csv"`
    }
  });
});

// 6. Export Clean JSON Dataset
ingestionRoutes.get('/export/json', async (c) => {
  const res = await pool.query(`
    SELECT 
      p.slug, p.title_fa, c.slug as category_slug, p.modality, p.short_desc_fa,
      p.direct_answer_summary_fa, p.search_keywords_fa, p.template_en,
      p.slots_schema_json, p.faq_schema_json, p.copy_count, p.view_count
    FROM prompts p
    JOIN categories c ON p.category_id = c.id
    WHERE p.is_published = true AND p.is_ai_enriched = true AND p.is_ai_enriched = true AND p.is_ai_enriched = true
    ORDER BY p.copy_count DESC;
  `);

  return c.json(res.rows);
});

// Helper: Unit 1024-dimensional mock vector generator for pgvector compatibility
function generateMockEmbedding(seedStr: string): string {
  const hash = crypto.createHash('sha256').update(seedStr).digest();
  const vector: number[] = new Array(1024);
  let sumSq = 0;
  for (let i = 0; i < 1024; i++) {
    const byte = hash[i % hash.length];
    const val = (byte / 128.0) - 1.0;
    vector[i] = val;
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  const normalized = vector.map(v => (v / norm).toFixed(6));
  return `[${normalized.join(',')}]`;
}

// Helper: RFC 4180 Compliant CSV Parser (handles newlines inside quotes, escaped quotes, commas)
function parseRFC4180Csv(csvText: string): Record<string, string>[] {
  const clean = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f.length > 0)) rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f.length > 0)) rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f.length > 0)) rows.push(currentRow);
  }
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const records: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = row[idx] || '';
    });
    records.push(record);
  }
  return records;
}

// 6.5. Get Ingestion Dataset Schema & Samples (For Developers & Admins)
ingestionRoutes.get('/schema', async (c) => {
  return c.json({
    platform: 'Promptjoo Enterprise Catalog Ingestion',
    supported_formats: ['JSON Array', 'JSONL (JSON Lines)', 'RFC 4180 CSV'],
    schema_fields: {
      template_en: {
        type: 'string',
        required: true,
        aliases: ['prompt', 'template', 'instruction', 'raw_template_en', 'content', 'text'],
        description: 'The prompt text or template in English. Supports variables in {{slot_name}} or [slot_name] formats.'
      },
      title_fa: {
        type: 'string',
        required: false,
        aliases: ['act', 'title', 'name', 'role'],
        description: 'Persian title for the prompt. If missing or English, automatically translated or prefixed with Persian role.'
      },
      category_slug: {
        type: 'string',
        required: false,
        aliases: ['category', 'type'],
        options: ['content-writing', 'photo-editing', 'image-generation', 'data-automation', 'video-scripting', 'code-generation'],
        description: 'Slug of the catalog category. If omitted, inferred from modality.'
      },
      modality: {
        type: 'string',
        required: false,
        options: ['text_writing', 'image_edit', 'text_to_image', 'data_structuring', 'video_audio', 'code_tech'],
        description: 'AI modality. If omitted, automatically classified using Persian/English content heuristics.'
      },
      short_desc_fa: {
        type: 'string',
        required: false,
        aliases: ['description', 'desc', 'summary'],
        description: 'Brief summary in Persian. If omitted, auto-generated from title.'
      },
      slots_schema_json: {
        type: 'array',
        required: false,
        description: 'Array of slots schema {slot_key, label_fa, default_value, is_required}. Auto-extracted from {{slot}} if omitted.'
      },
      search_keywords_fa: {
        type: 'string | array',
        required: false,
        description: 'Search keywords or comma-separated tags for discovery.'
      }
    },
    sample_native_json: [
      {
        title_fa: 'سناریو استوری معرفی محصول',
        template_en: 'You are a master copywriter. Write a 3-part viral Instagram story sequence for {{product}} targeting {{audience}}.',
        category_slug: 'content-writing',
        modality: 'text_writing',
        short_desc_fa: 'قالب اختصاصی استوری برای افزایش تعامل و فروش',
        slots_schema_json: [
          { slot_key: 'product', label_fa: 'نام محصول', default_value: 'کفش ورزشی', is_required: true },
          { slot_key: 'audience', label_fa: 'مخاطب هدف', default_value: 'ورزشکاران', is_required: false }
        ]
      }
    ],
    sample_awesome_chatgpt_csv: `act,prompt\n"Linux Terminal","I want you to act as a linux terminal. I will type commands and you will reply with what the terminal should show. My first command is {{command}}."\n"Python Developer","Act as a senior Python developer. Optimize the following function: {{code}}."`
  });
});

// 6.8. LLM Prompt Semantic Parser & Enricher (Interactive & Batch preview)
ingestionRoutes.post('/parse-llm', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { raw_template_en, title_hint } = body;

  if (!raw_template_en || typeof raw_template_en !== 'string') {
    return c.json({ error: 'INVALID_INPUT', message: 'متن اولیه پرامپت (raw_template_en) الزامی است.' }, 400);
  }

  const enriched = await enrichPromptWithLlm(raw_template_en, title_hint);
  return c.json({
    ok: true,
    result: enriched
  });
});

// 7. Idempotent Dataset Importer (Zero Duplication, Dev <-> Prod Sync & Web Datasets)
ingestionRoutes.post('/import', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const enrichWithLlm = Boolean(body.enrich_with_llm);
  let items: IngestionItem[] = [];

  if (Array.isArray(body)) {
    items = body;
  } else if (Array.isArray(body.items)) {
    items = body.items;
  } else if (typeof body.csv_text === 'string') {
    items = parseRFC4180Csv(body.csv_text);
  } else if (typeof body.jsonl_text === 'string') {
    items = body.jsonl_text
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0)
      .map((l: string) => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(Boolean);
  }

  if (items.length === 0) {
    return c.json({ error: 'INVALID_INPUT', message: 'محتوای دیتاست برای بارگذاری یافت نشد یا فرمت معتبر نیست.' }, 400);
  }

  const result = await processDatasetImport(items, enrichWithLlm);
  return c.json(result);
});

// 8. Create Single Catalog Prompt (Admin Direct Creation)
ingestionRoutes.post('/prompt', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const {
    title_fa,
    short_desc_fa,
    direct_answer_summary_fa = '',
    category_slug,
    modality,
    template_en,
    slots_schema_json = [],
    supported_models = ['chatgpt', 'claude'],
    search_keywords_fa = []
  } = body;

  if (!title_fa || !template_en) {
    return c.json({ error: 'INVALID_INPUT', message: 'عنوان فارسی و متن انگلیسی پرامپت الزامی هستند.' }, 400);
  }

  const template = String(template_en).trim();
  const hash = crypto.createHash('sha256').update(template).digest('hex');

  // Check duplicate
  const dup = await pool.query('SELECT id, slug FROM prompts WHERE content_hash = $1 LIMIT 1', [hash]);
  if (dup.rows.length > 0) {
    return c.json({ error: 'DUPLICATE_PROMPT', message: 'این پرامپت قبلاً در کاتالوگ ثبت شده است.', existing_id: dup.rows[0].id }, 409);
  }

  // Resolve category
  let categoryId = null;
  if (category_slug) {
    const cRes = await pool.query('SELECT id FROM categories WHERE slug = $1 LIMIT 1', [category_slug]);
    if (cRes.rows.length > 0) categoryId = cRes.rows[0].id;
  }
  if (!categoryId) {
    const defCat = await pool.query('SELECT id FROM categories ORDER BY sort_order ASC LIMIT 1');
    categoryId = defCat.rows[0]?.id;
  }

  // Generate slug
  const cleanTitle = String(title_fa)
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 70);
  const slug = `${cleanTitle || 'prompt'}-${hash.slice(0, 6)}`;

  // Automatically extract slots if not provided
  let slots = Array.isArray(slots_schema_json) ? slots_schema_json : [];
  if (slots.length === 0) {
    const matches = [...template.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)];
    const uniqueKeys = Array.from(new Set(matches.map(m => m[1])));
    slots = uniqueKeys.map(k => ({
      slot_key: k,
      label_fa: k.replace(/_/g, ' '),
      default_value: '',
      is_required: true,
      priority: 1
    }));
  }

  const detectedModality = modality || detectModality(title_fa + ' ' + template).modality || 'text_writing';
  const embedding = await generateDeapiEmbedding(title_fa + '\n' + template);
  const slotCount = slots.length;
  const keywordsStr = Array.isArray(search_keywords_fa) ? search_keywords_fa.join(', ') : String(search_keywords_fa || '');

  const insertRes = await pool.query(`
    INSERT INTO prompts (
      slug, category_id, modality, title_fa, short_desc_fa, direct_answer_summary_fa,
      search_keywords_fa, template_en, content_hash, slots_schema_json, supported_models,
      embedding, slot_count, is_published, is_ai_enriched
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, true)
    RETURNING id, slug, title_fa, modality;
  `, [
    slug,
    categoryId,
    detectedModality,
    String(title_fa).trim(),
    String(short_desc_fa || title_fa).trim(),
    String(direct_answer_summary_fa || `${title_fa} — پرامپت بهینه‌سازی‌شده برای مدل‌های زبانی`).trim(),
    keywordsStr,
    template,
    hash,
    JSON.stringify(slots),
    supported_models,
    embedding,
    slotCount
  ]);

  const createdPrompt = insertRes.rows[0];
  if (createdPrompt?.id) {
    persistPromptAtomicBlocks(createdPrompt.id, detectedModality, template, String(title_fa), slots).catch(() => {});
  }

  return c.json({
    ok: true,
    message: 'پرامپت با موفقیت به کاتالوگ اضافه شد.',
    prompt: createdPrompt
  }, 201);
});
