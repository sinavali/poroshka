import crypto from 'node:crypto';
import { pool } from '../../infrastructure/database/client.ts';
import { detectModality } from '@promptjoo/persian-normalizer';
import { enrichPromptWithLlm } from './llm-enricher.service.ts';
import {
  generateDeapiBatchEmbeddings,
  generateMockEmbedding
} from '../../infrastructure/ai/deapi-embedding.service.ts';
import { persistPromptAtomicBlocks } from './atomic-decomposer.service.ts';

export { generateMockEmbedding };

export interface IngestionItem {
  template_en?: string;
  prompt?: string;
  template?: string;
  instruction?: string;
  raw_template_en?: string;
  content?: string;
  text?: string;
  title_fa?: string;
  act?: string;
  title?: string;
  name?: string;
  role?: string;
  modality?: string;
  category_slug?: string;
  short_desc_fa?: string;
  description?: string;
  desc?: string;
  direct_answer_summary_fa?: string;
  summary?: string;
  slots_schema_json?: unknown;
  search_keywords_fa?: unknown;
  faq_schema_json?: unknown;
  enrich_with_llm?: boolean;
  slug?: string;
  [key: string]: unknown;
}

export interface DatasetImportResult {
  ok: boolean;
  message: string;
  total_processed: number;
  inserted: number;
  skipped_duplicates: number;
  error_count: number;
  sample_errors: string[];
}

interface PreparedPrompt {
  slug: string;
  categoryId: string;
  modality: string;
  titleFa: string;
  shortDesc: string;
  directAnswer: string;
  keywords: string;
  template: string;
  hash: string;
  slotsJson: string;
  faqsJson: string;
  embedding: string;
  slotCount: number;
  isEnriched: boolean;
}

const MODALITY_TO_CAT_MAP: Record<string, string> = {
  text_writing: 'content-writing',
  code_tech: 'coding-tech',
  text_to_image: 'image-generation',
  image_edit: 'photo-editing',
  data_structuring: 'excel-data',
  video_audio: 'reels-voice'
};

const VALID_MODALITIES = ['text_writing', 'code_tech', 'text_to_image', 'image_edit', 'data_structuring', 'video_audio'];

/**
 * High-speed batched dataset importer
 * Optimized for remote databases: bulk deduplication via ANY($1) and chunked multi-row inserts
 */
export async function processDatasetImport(
  items: IngestionItem[],
  enrichWithLlm = false
): Promise<DatasetImportResult> {
  // 1. Fetch categories map (single query)
  const catsRes = await pool.query('SELECT id, slug FROM categories');
  const catMap = new Map<string, string>();
  for (const cat of catsRes.rows) {
    catMap.set(cat.slug, cat.id);
  }
  const defaultCategoryId = catsRes.rows[0]?.id;

  const prepared: PreparedPrompt[] = [];
  const seenHashesInBatch = new Set<string>();
  const seenSlugsInBatch = new Set<string>();
  let skippedDuplicates = 0;
  const errors: string[] = [];

  // 2. Prepare items in memory
  for (const item of items) {
    try {
      let template = (
        item.template_en ||
        item.prompt ||
        item.template ||
        item.instruction ||
        item.raw_template_en ||
        item.content ||
        item.text ||
        ''
      ).trim();

      if (!template) continue;

      let rawTitle = (item.title_fa || item.act || item.title || item.name || item.role || '').trim();
      let titleFa = rawTitle;
      let detectedModality = item.modality;
      let shortDesc = item.short_desc_fa || item.description || item.desc || '';
      let directAnswer = item.direct_answer_summary_fa || item.summary || '';
      let slots = Array.isArray(item.slots_schema_json)
        ? item.slots_schema_json
        : (typeof item.slots_schema_json === 'string' ? JSON.parse(item.slots_schema_json || '[]') : []);
      let keywords = Array.isArray(item.search_keywords_fa)
        ? item.search_keywords_fa.join(', ')
        : (item.search_keywords_fa ? String(item.search_keywords_fa) : '');

      // Check if prompt is already processed/enriched (e.g. pre-built prompts.json)
      const hasFarsiTitle = Boolean(titleFa && /[\u0600-\u06FF]/.test(titleFa));
      const hasSlots = Array.isArray(slots) && slots.length > 0;
      const isAlreadyProcessed = hasFarsiTitle && (hasSlots || /\{\{[a-zA-Z0-9_]+\}\}/.test(template));

      if (isAlreadyProcessed && !enrichWithLlm) {
        // FAST-PATH: Already processed JSON prompt. Skip LLM entirely, only vectorize and index!
        template = template.replace(/\[([a-zA-Z0-9_\s]{2,40})\]/g, (_: string, match: string) => {
          const key = match.trim().toLowerCase().replace(/[\s-]+/g, '_');
          return `{{${key}}}`;
        });
        template = template.replace(/<([a-zA-Z0-9_\s]{2,40})>/g, (_: string, match: string) => {
          const key = match.trim().toLowerCase().replace(/[\s-]+/g, '_');
          return `{{${key}}}`;
        });

        if (!detectedModality || !VALID_MODALITIES.includes(detectedModality)) {
          detectedModality = detectModality(titleFa + ' ' + template).modality || 'text_writing';
        }

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

        if (!shortDesc) {
          shortDesc = `${titleFa} — قالب بهینه‌سازی‌شده برای دریافت بهترین خروجی از مدل‌های هوش مصنوعی.`;
        }
        if (!directAnswer) {
          directAnswer = `پرامپت مهندسی‌شده ${titleFa} با قابلیت شخصی‌سازی متغیرها برای کاربران.`;
        }
        if (!keywords) {
          keywords = `${titleFa}, پرامپت, هوش مصنوعی`;
        }
      } else {
        // RAW PROMPT (e.g. CSV with act and prompt): Apply ingestion / LLM enrichment pipeline in-process
        const enriched = await enrichPromptWithLlm(template, rawTitle, undefined, true);
        template = enriched.template_en;
        if (!titleFa || /^[a-zA-Z0-9\s\-_.,/]+$/.test(titleFa)) titleFa = enriched.title_fa;
        if (!detectedModality) detectedModality = enriched.modality;
        if (!shortDesc) shortDesc = enriched.short_desc_fa;
        if (!directAnswer) directAnswer = enriched.direct_answer_summary_fa;
        if (slots.length === 0) slots = enriched.slots_schema_json;
        if (!keywords) keywords = enriched.search_keywords_fa.join(', ');
      }

      const hash = crypto.createHash('sha256').update(template).digest('hex');
      const cleanSlugTitle = titleFa
        .toLowerCase()
        .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 60);
      const slug = (item.slug || `${cleanSlugTitle || 'prompt'}-${hash.slice(0, 6)}`).toLowerCase();

      // Intra-batch duplicate check
      if (seenHashesInBatch.has(hash) || seenSlugsInBatch.has(slug)) {
        skippedDuplicates++;
        continue;
      }
      seenHashesInBatch.add(hash);
      seenSlugsInBatch.add(slug);

      const targetCatSlug = item.category_slug || MODALITY_TO_CAT_MAP[detectedModality] || 'content-writing';
      const categoryId = catMap.get(targetCatSlug) || defaultCategoryId;
      const faqs = typeof item.faq_schema_json === 'string'
        ? JSON.parse(item.faq_schema_json || '[]')
        : (item.faq_schema_json || []);

      const embedding = generateMockEmbedding(slug + titleFa + template);

      prepared.push({
        slug,
        categoryId,
        modality: detectedModality,
        titleFa,
        shortDesc,
        directAnswer,
        keywords,
        template,
        hash,
        slotsJson: JSON.stringify(slots),
        faqsJson: JSON.stringify(faqs),
        embedding,
        slotCount: slots.length,
        isEnriched: true
      });
    } catch (err: unknown) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (prepared.length === 0) {
    return {
      ok: true,
      message: 'هیچ رکورد معتبری برای بارگذاری یافت نشد یا تمام موارد تکراری بودند.',
      total_processed: items.length,
      inserted: 0,
      skipped_duplicates: skippedDuplicates,
      error_count: errors.length,
      sample_errors: errors.slice(0, 3)
    };
  }

  // 3. Bulk DB Deduplication (Single Query)
  const allHashes = prepared.map(p => p.hash);
  const allSlugs = prepared.map(p => p.slug);
  const existingRes = await pool.query(
    'SELECT content_hash, slug FROM prompts WHERE content_hash = ANY($1) OR slug = ANY($2)',
    [allHashes, allSlugs]
  );
  const existingHashes = new Set<string>();
  const existingSlugs = new Set<string>();
  for (const r of existingRes.rows) {
    if (r.content_hash) existingHashes.add(r.content_hash);
    if (r.slug) existingSlugs.add(r.slug);
  }

  const toInsert = prepared.filter(p => {
    if (existingHashes.has(p.hash) || existingSlugs.has(p.slug)) {
      skippedDuplicates++;
      return false;
    }
    return true;
  });

  // Generate real 1024-d deAPI embeddings for new prompts
  if (toInsert.length > 0) {
    const textsToEmbed = toInsert.map((p) => `${p.titleFa}\n${p.template}`);
    const embeddings = await generateDeapiBatchEmbeddings(textsToEmbed);
    for (let i = 0; i < toInsert.length; i++) {
      if (embeddings[i]) {
        toInsert[i].embedding = embeddings[i];
      }
    }
  }

  // 4. Multi-Row Bulk Insert in chunks of 50
  let inserted = 0;
  const CHUNK_SIZE = 50;
  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    const valueClauses: string[] = [];
    const values: unknown[] = [];
    let pIdx = 1;

    for (const row of chunk) {
      valueClauses.push(`(
        $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
        $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++},
        $${pIdx++}, true, $${pIdx++}
      )`);
      values.push(
        row.slug, row.categoryId, row.modality, row.titleFa, row.shortDesc, row.directAnswer,
        row.keywords, row.template, row.hash, row.slotsJson, row.faqsJson, row.embedding,
        row.slotCount, row.isEnriched
      );
    }

    try {
      const insertSql = `
        INSERT INTO prompts (
          slug, category_id, modality, title_fa, short_desc_fa, direct_answer_summary_fa,
          search_keywords_fa, template_en, content_hash, slots_schema_json, faq_schema_json,
          embedding, slot_count, is_published, is_ai_enriched
        )
        VALUES ${valueClauses.join(', ')}
        ON CONFLICT DO NOTHING
        RETURNING id, modality, template_en, title_fa, slots_schema_json
      `;
      const res = await pool.query(insertSql, values);
      inserted += res.rowCount || 0;
      skippedDuplicates += (chunk.length - (res.rowCount || 0));

      // Decompose and persist granulated atomic blocks for every newly inserted prompt
      for (const row of res.rows) {
        persistPromptAtomicBlocks(row.id, row.modality, row.template_en, row.title_fa, row.slots_schema_json).catch(() => {});
      }
    } catch {
      // Fallback row-by-row for this chunk
      for (const row of chunk) {
        try {
          const singleRes = await pool.query(`
            INSERT INTO prompts (
              slug, category_id, modality, title_fa, short_desc_fa, direct_answer_summary_fa,
              search_keywords_fa, template_en, content_hash, slots_schema_json, faq_schema_json,
              embedding, slot_count, is_published, is_ai_enriched
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14)
            ON CONFLICT DO NOTHING
            RETURNING id
          `, [
            row.slug, row.categoryId, row.modality, row.titleFa, row.shortDesc, row.directAnswer,
            row.keywords, row.template, row.hash, row.slotsJson, row.faqsJson, row.embedding,
            row.slotCount, row.isEnriched
          ]);
          if ((singleRes.rowCount || 0) > 0) {
            inserted++;
            const newId = singleRes.rows[0]?.id;
            if (newId) {
              persistPromptAtomicBlocks(newId, row.modality, row.template, row.titleFa, JSON.parse(row.slotsJson || '[]')).catch(() => {});
            }
          } else {
            skippedDuplicates++;
          }
        } catch (innerErr: unknown) {
          errors.push(innerErr instanceof Error ? innerErr.message : String(innerErr));
        }
      }
    }
  }

  return {
    ok: true,
    message: 'فرایند بارگذاری و همگام‌سازی دیتاست به اتمام رسید.',
    total_processed: items.length,
    inserted,
    skipped_duplicates: skippedDuplicates,
    error_count: errors.length,
    sample_errors: errors.slice(0, 3)
  };
}
