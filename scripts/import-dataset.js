#!/usr/bin/env node

/**
 * Promptjoo Dataset Importer (Zero Duplication Sync)
 * Imports CSV or JSON dataset into PostgreSQL, strictly deduplicating via content_hash & slug.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:jsF68GOoGS5inojpHmRa@remote-respina-free.runflare.com:31725/promptjoo_db';

const targetFile = process.argv[2];
if (!targetFile) {
  console.error('\x1b[31mUsage:\x1b[0m node scripts/import-dataset.js <path-to-file.csv|path-to-file.json>');
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), targetFile);
if (!fs.existsSync(resolvedPath)) {
  console.error(`\x1b[31mFile not found:\x1b[0m ${resolvedPath}`);
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL });

async function importDataset() {
  console.log('\x1b[36m%s\x1b[0m', '================================================');
  console.log('\x1b[36m%s\x1b[0m', '📥 PROMPTJOO DATASET IMPORTER (DEDUPLICATION)');
  console.log('\x1b[36m%s\x1b[0m', '================================================\n');
  console.log(`Loading: ${resolvedPath} ...\n`);

  const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
  let items = [];

  if (resolvedPath.endsWith('.json')) {
    items = JSON.parse(fileContent);
  } else {
    // Parse CSV
    const csvLines = fileContent.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim().length > 0);
    if (csvLines.length > 1) {
      const headerCols = csvLines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
      for (let i = 1; i < csvLines.length; i++) {
        const values = csvLines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
        const itemObj = {};
        for (let h = 0; h < headerCols.length; h++) {
          itemObj[headerCols[h]] = values[h] || '';
        }
        items.push(itemObj);
      }
    }
  }

  console.log(`Total rows to inspect: ${items.length}`);

  // Fetch categories
  const catsRes = await pool.query('SELECT id, slug FROM categories');
  const catMap = new Map();
  for (const cat of catsRes.rows) {
    catMap.set(cat.slug, cat.id);
  }
  const defaultCategoryId = catsRes.rows[0]?.id;

  let inserted = 0;
  let skippedDuplicates = 0;

  for (const item of items) {
    const template = (item.template_en || item.raw_template_en || '').trim();
    const titleFa = (item.title_fa || 'پرامپت جدید').trim();
    if (!template) continue;

    const hash = crypto.createHash('sha256').update(template).digest('hex');
    const slug = (item.slug || titleFa.replace(/[\s\-_]+/g, '-').slice(0, 80) + '-' + hash.slice(0, 6)).toLowerCase();

    // Check duplicate
    const checkRes = await pool.query(
      'SELECT id FROM prompts WHERE content_hash = $1 OR slug = $2 LIMIT 1',
      [hash, slug]
    );

    if (checkRes.rows.length > 0) {
      skippedDuplicates++;
      continue;
    }

    const categoryId = catMap.get(item.category_slug) || defaultCategoryId;
    const detected = item.modality || 'text_writing';
    const slots = typeof item.slots_schema_json === 'string' ? JSON.parse(item.slots_schema_json || '[]') : (item.slots_schema_json || []);
    const faqs = typeof item.faq_schema_json === 'string' ? JSON.parse(item.faq_schema_json || '[]') : (item.faq_schema_json || []);
    const keywords = Array.isArray(item.search_keywords_fa)
      ? item.search_keywords_fa
      : (item.search_keywords_fa ? String(item.search_keywords_fa).split(',').map(k => k.trim()) : []);

    await pool.query(`
      INSERT INTO prompts (
        slug, category_id, modality, title_fa, short_desc_fa, direct_answer_summary_fa,
        search_keywords_fa, template_en, content_hash, slots_schema_json, faq_schema_json,
        is_published
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
    `, [
      slug, categoryId, detected, titleFa,
      item.short_desc_fa || titleFa,
      item.direct_answer_summary_fa || '',
      keywords, template, hash, JSON.stringify(slots), JSON.stringify(faqs)
    ]);

    inserted++;
  }

  console.log('\n\x1b[32m%s\x1b[0m', '✅ Sync finished:');
  console.log(`  ➕ New Prompts Inserted: ${inserted}`);
  console.log(`  ⏭️  Duplicates Skipped:    ${skippedDuplicates}`);
  await pool.end();
}

importDataset().catch((err) => {
  console.error('\x1b[31mImport failed:\x1b[0m', err);
  process.exit(1);
});
