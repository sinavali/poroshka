import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/bootstrap/server.ts';
import { pool } from '../src/infrastructure/database/client.ts';
import { redisService } from '../src/infrastructure/cache/redis.ts';

describe('Promptjoo Core API Integration Tests', () => {
  const app = createServer();
  const testSlug = 'test-ep-prompt-slug';

  before(async () => {
    const catRes = await pool.query("SELECT id FROM categories WHERE slug = 'content-writing' LIMIT 1");
    const categoryId = catRes.rows[0]?.id;
    if (categoryId) {
      await pool.query(`
        INSERT INTO prompts (
          slug, category_id, modality, title_fa, short_desc_fa, direct_answer_summary_fa,
          search_keywords_fa, template_en, content_hash, slots_schema_json, faq_schema_json,
          embedding, slot_count, is_published, is_ai_enriched, created_at, updated_at
        ) VALUES (
          $1, $2, 'text_writing', 'پرامپت تستی برای اعتبارسنجی', 'توضیحات تستی', 'پاسخ مستقیم تستی',
          'تست,هوش مصنوعی', 'Write an engaging post about {{topic_title}} with a {{brand_tone}} tone.',
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          '[{"slot_key": "topic_title", "label_fa": "موضوع", "default_value": "AI", "is_required": true}, {"slot_key": "brand_tone", "label_fa": "لحن", "default_value": "حرفه‌ای", "is_required": false}]'::jsonb,
          '[]'::jsonb,
          ('[' || array_to_string(array_fill(0::float4, ARRAY[1024]), ',') || ']')::vector,
          2, true, true, NOW(), NOW()
        ) ON CONFLICT (slug) DO NOTHING;
      `, [testSlug, categoryId]);
    }

    // Ensure at least one active Yektanet ad configuration exists for test determinism
    await pool.query("UPDATE ad_network_configs SET is_active = true WHERE provider = 'yektanet'");
  });

  after(async () => {
    try {
      await pool.query('DELETE FROM prompts WHERE slug = $1', [testSlug]);
    } catch {
      // Ignore cleanup error if pool is closed
    }
    await pool.end();
    await redisService.close();
  });

  it('GET /healthz returns 200 and healthy status', async () => {
    const res = await app.request('/healthz');
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.status, 'healthy');
    assert.ok(typeof data.uptime_seconds === 'number');
  });

  it('GET /readyz returns 200 and database connected', async () => {
    const res = await app.request('/readyz');
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.status, 'ready');
    assert.equal(data.database, 'connected');
  });

  it('GET /api/v1/identity/altcha-challenge returns challenge, salt and signature', async () => {
    const res = await app.request('/api/v1/identity/altcha-challenge');
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(data.challenge);
    assert.ok(data.salt);
    assert.ok(data.signature);
  });

  it('GET /api/v1/catalog/categories returns active categories', async () => {
    const res = await app.request('/api/v1/catalog/categories');
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 6);
    assert.ok(data.some(c => c.slug === 'content-writing'));
  });

  it('GET /api/v1/catalog/prompts returns paginated items', async () => {
    const res = await app.request('/api/v1/catalog/prompts');
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(Array.isArray(data.items));
    assert.ok(data.items.length >= 1);
    assert.equal(data.page, 1);
  });

  it('GET /api/v1/catalog/prompts/:slug returns prompt detail', async () => {
    const res = await app.request(`/api/v1/catalog/prompts/${testSlug}`);
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.slug, testSlug);
    assert.equal(data.modality, 'text_writing');
    assert.ok(Array.isArray(data.slots_schema_json));
  });

  it('POST /api/v1/catalog/prompts/:slug/copy compiles template with slot values', async () => {
    const res = await app.request(`/api/v1/catalog/prompts/${testSlug}/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_values: {
          topic_title: 'معرفی اپلیکیشن‌های برتر هوش مصنوعی',
          brand_tone: 'انرژیک و الهام‌بخش'
        },
        force_farsi_output: true
      })
    });
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(data.compiled_text.includes('معرفی اپلیکیشن‌های برتر هوش مصنوعی'));
    assert.ok(data.compiled_text.includes('OUTPUT LANGUAGE DIRECTIVE'));
  });

  it('POST /api/v1/catalog/forge stitches atomic blocks without LLM', async () => {
    const res = await app.request('/api/v1/catalog/forge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'یک تصویر باکیفیت از منظره غروب خورشید در کویر لوت',
        modality: 'text_to_image'
      })
    });
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.modality, 'text_to_image');
    assert.ok(data.stitched_template.includes('[TASK]'));
    assert.ok(data.compiled_text);
  });

  it('GET /api/v1/monetization/active-units returns active Yektanet and Tapsell configs', async () => {
    const res = await app.request('/api/v1/monetization/active-units');
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(Array.isArray(data));
    assert.ok(data.some(u => u.provider === 'yektanet'));
  });

  it('GET /api/v1/ingestion/schema returns supported formats and field definitions', async () => {
    const res = await app.request('/api/v1/ingestion/schema');
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(Array.isArray(data.supported_formats));
    assert.ok(data.schema_fields.template_en);
    assert.ok(data.schema_fields.title_fa);
  });

  it('POST /api/v1/ingestion/import ingests dataset idempotently with duplicate prevention', async () => {
    const testCsv = `"act","prompt"\n"Test Docker Deployer","Act as a DevOps engineer. Create a Dockerfile for {{app_runtime}} with caching."`;
    const res = await app.request('/api/v1/ingestion/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv_text: testCsv })
    });
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(data.ok);
    assert.equal(data.total_processed, 1);
    assert.ok(data.inserted === 1 || data.skipped_duplicates === 1);
  });

  it('POST /api/v1/ingestion/parse-llm enriches prompt with slots schema', async () => {
    const res = await app.request('/api/v1/ingestion/parse-llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_template_en: 'Act as a senior engineer. Review the following [code_snippet] for [programming_language].',
        title_hint: 'Code Reviewer'
      })
    });
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(data.ok);
    assert.ok(data.result);
    assert.ok(data.result.template_en.includes('{{') || Array.isArray(data.result.slots_schema_json));
    assert.ok(data.result.title_fa);
    assert.ok(Array.isArray(data.result.slots_schema_json));
    assert.ok(data.result.slots_schema_json.length >= 1);
  });
});

