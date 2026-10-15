import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/bootstrap/server.ts';

describe('Promptjoo Core API Integration Tests', () => {
  const app = createServer();

  it('GET /healthz returns 200 and healthy status', async () => {
    const res = await app.request('/healthz');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'healthy');
    assert.ok(typeof data.uptime_seconds === 'number');
  });

  it('GET /readyz returns 200 and database connected', async () => {
    const res = await app.request('/readyz');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ready');
    assert.equal(data.database, 'connected');
  });

  it('GET /api/v1/identity/altcha-challenge returns challenge, salt and signature', async () => {
    const res = await app.request('/api/v1/identity/altcha-challenge');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.challenge);
    assert.ok(data.salt);
    assert.ok(data.signature);
  });

  it('GET /api/v1/catalog/categories returns active categories', async () => {
    const res = await app.request('/api/v1/catalog/categories');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 6);
    assert.ok(data.some(c => c.slug === 'content-writing'));
  });

  it('GET /api/v1/catalog/prompts returns paginated items', async () => {
    const res = await app.request('/api/v1/catalog/prompts');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.items));
    assert.ok(data.items.length >= 1);
    assert.equal(data.page, 1);
  });

  it('GET /api/v1/catalog/prompts/:slug returns prompt detail', async () => {
    const res = await app.request('/api/v1/catalog/prompts/instagram-viral-hook-caption');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.slug, 'instagram-viral-hook-caption');
    assert.equal(data.modality, 'text_writing');
    assert.ok(Array.isArray(data.slots_schema_json));
  });

  it('POST /api/v1/catalog/prompts/:slug/copy compiles template with slot values', async () => {
    const res = await app.request('/api/v1/catalog/prompts/instagram-viral-hook-caption/copy', {
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
    const data = await res.json();
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
    const data = await res.json();
    assert.equal(data.modality, 'text_to_image');
    assert.ok(data.stitched_template.includes('[TASK]'));
    assert.ok(data.compiled_text);
  });

  it('GET /api/v1/monetization/active-units returns active Yektanet and Tapsell configs', async () => {
    const res = await app.request('/api/v1/monetization/active-units');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.some(u => u.provider === 'yektanet'));
  });
});
