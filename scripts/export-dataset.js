#!/usr/bin/env node

/**
 * Promptjoo Dataset Exporter (Dev <-> Prod Sync)
 * Dumps catalog prompts to CSV (with UTF-8 BOM) and JSON.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATASETS_DIR = path.join(ROOT_DIR, 'datasets');

if (!fs.existsSync(DATASETS_DIR)) {
  fs.mkdirSync(DATASETS_DIR, { recursive: true });
}

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:jsF68GOoGS5inojpHmRa@remote-respina-free.runflare.com:31725/promptjoo_db';

const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL });

async function exportDataset() {
  console.log('\x1b[36m%s\x1b[0m', '================================================');
  console.log('\x1b[36m%s\x1b[0m', '📦 PROMPTJOO DATASET EXPORTER');
  console.log('\x1b[36m%s\x1b[0m', '================================================\n');

  try {
    const res = await pool.query(`
      SELECT 
        p.slug, p.title_fa, c.slug as category_slug, p.modality, p.short_desc_fa,
        p.direct_answer_summary_fa, p.search_keywords_fa,
        p.template_en, p.slots_schema_json, p.faq_schema_json, p.copy_count, p.view_count
      FROM prompts p
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_published = true
      ORDER BY p.copy_count DESC;
    `);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const jsonPath = path.join(DATASETS_DIR, `catalog-export-${timestamp}.json`);
    const csvPath = path.join(DATASETS_DIR, `catalog-export-${timestamp}.csv`);

    // 1. Write JSON
    fs.writeFileSync(jsonPath, JSON.stringify(res.rows, null, 2), 'utf-8');
    console.log(`\x1b[32m✓ JSON Exported:\x1b[0m ${jsonPath} (${res.rows.length} prompts)`);

    // 2. Write CSV with UTF-8 BOM
    const headers = [
      'slug', 'title_fa', 'category_slug', 'modality', 'short_desc_fa',
      'direct_answer_summary_fa', 'search_keywords_fa', 'template_en',
      'slots_schema_json', 'faq_schema_json', 'copy_count', 'view_count'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [headers.join(',')];
    for (const row of res.rows) {
      csvRows.push(headers.map(h => escapeCsv(row[h])).join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    fs.writeFileSync(csvPath, csvContent, 'utf-8');
    console.log(`\x1b[32m✓ CSV Exported:\x1b[0m  ${csvPath}`);
    console.log('\n\x1b[33m%s\x1b[0m', 'Export finished successfully. You can now sync or commit these files.');
  } catch (err) {
    console.error('\x1b[31mExport failed:\x1b[0m', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

exportDataset();
