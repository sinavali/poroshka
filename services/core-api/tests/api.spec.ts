import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/bootstrap/server.ts';
import { pool } from '../src/infrastructure/database/client.ts';
import { redisService } from '../src/infrastructure/cache/redis.ts';
import { altchaValidator } from '../src/infrastructure/http-clients/altcha.validator.ts';
import crypto from 'node:crypto';

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

  it('POST /api/v1/identity/send-otp rejects invalid Altcha CAPTCHA payload with 400', async () => {
    const res = await app.request('/api/v1/identity/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '09129998877',
        purpose: 'LOGIN',
        altcha_payload: 'invalid_base64_payload'
      })
    });
    assert.equal(res.status, 400);
    const data = (await res.json()) as any;
    assert.equal(data.error, 'INVALID_CAPTCHA');
  });

  it('altchaValidator rejects forged/expired timestamp and duplicate replay', async () => {
    // 1. Rejects expired challenge
    const expiredChallenge = altchaValidator.createChallenge(-60);
    let expiredSolved = -1;
    for (let i = 1000; i <= 60000; i++) {
      const h = crypto.createHash('sha256').update(expiredChallenge.salt + i).digest('hex');
      if (h === expiredChallenge.challenge) {
        expiredSolved = i;
        break;
      }
    }
    const expiredPayload = Buffer.from(JSON.stringify({
      algorithm: 'SHA-256',
      challenge: expiredChallenge.challenge,
      number: expiredSolved,
      salt: expiredChallenge.salt,
      signature: expiredChallenge.signature,
      expires_at: 9999999999 // Tampered expiration in JSON body
    })).toString('base64');
    const expiredValid = await altchaValidator.verify(expiredPayload);
    assert.equal(expiredValid, false);

    // 2. Fresh challenge succeeds once and fails on replay
    const freshChallenge = altchaValidator.createChallenge(300);
    let freshSolved = -1;
    for (let i = 1000; i <= 60000; i++) {
      const h = crypto.createHash('sha256').update(freshChallenge.salt + i).digest('hex');
      if (h === freshChallenge.challenge) {
        freshSolved = i;
        break;
      }
    }
    const freshPayload = Buffer.from(JSON.stringify({
      algorithm: 'SHA-256',
      challenge: freshChallenge.challenge,
      number: freshSolved,
      salt: freshChallenge.salt,
      signature: freshChallenge.signature
    })).toString('base64');
    const firstCheck = await altchaValidator.verify(freshPayload);
    assert.equal(firstCheck, true);

    const replayCheck = await altchaValidator.verify(freshPayload);
    assert.equal(replayCheck, false);
  });

  it('POST /api/v1/campaigns/webhook/telegram accepts inbound webhook payload', async () => {
    const res = await app.request('/api/v1/campaigns/webhook/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ update_id: 123456 })
    });
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.deepEqual(data, { ok: true });
  });

  it('GET /api/v1/monetization/configs safely handles unvalidated slot enum values', async () => {
    const res = await app.request('/api/v1/monetization/configs?slot=UNKNOWN_SLOT_NON_EXISTENT');
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(Array.isArray(data));
    assert.equal(data.length, 0);
  });

  it('GET /api/v1/catalog/prompts restricts public limit to 50 but permits up to 1000 for sitemap', async () => {
    const publicRes = await app.request('/api/v1/catalog/prompts?limit=500');
    assert.equal(publicRes.status, 200);
    const publicData = (await publicRes.json()) as any;
    assert.equal(publicData.limit, 50);

    const sitemapRes = await app.request('/api/v1/catalog/prompts?limit=500&sitemap=true');
    assert.equal(sitemapRes.status, 200);
    const sitemapData = (await sitemapRes.json()) as any;
    assert.equal(sitemapData.limit, 500);
  });

  it('Admin routes enforce authentication across all subroutes', async () => {
    const adRes = await app.request('/api/v1/admin/ad-configs');
    assert.equal(adRes.status, 401);

    const sessRes = await app.request('/api/v1/admin/sessions');
    assert.equal(sessRes.status, 401);

    const embRes = await app.request('/api/v1/admin/embedding-profiles');
    assert.equal(embRes.status, 401);
  });

  it('Idempotency middleware prevents duplicate state mutations', async () => {
    const idempKey = '33333333-3333-4333-8333-333333333333';
    const clickPayload = {
      placement_slot: 'FEED_NATIVE_CARD_3',
      provider: 'yektanet',
      zone_id: 'yn-slot-feed',
      client_uuid: '44444444-4444-4444-8444-444444444444'
    };

    const res1 = await app.request('/api/v1/monetization/events/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempKey
      },
      body: JSON.stringify(clickPayload)
    });
    assert.equal(res1.status, 200);
    const data1 = (await res1.json()) as any;
    assert.equal(data1.ok, true);

    // Second call with same idempotency key returns cached response
    const res2 = await app.request('/api/v1/monetization/events/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempKey
      },
      body: JSON.stringify(clickPayload)
    });
    assert.equal(res2.status, 200);
    const data2 = (await res2.json()) as any;
    assert.deepEqual(data1, data2);

    // Call with modified body triggers 409 mismatch
    const res3 = await app.request('/api/v1/monetization/events/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempKey
      },
      body: JSON.stringify({ ...clickPayload, zone_id: 'tampered-zone' })
    });
    assert.equal(res3.status, 409);
  });
});

