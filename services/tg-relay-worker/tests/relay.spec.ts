import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.ts';

describe('Telegram Relay Worker Tests', () => {
  const env = {
    RELAY_SECRET: 'test_relay_secret_123',
    CORE_API_URL: 'https://core-api.poroshka.ir'
  };

  it('GET /healthz returns 200 OK', async () => {
    const req = new Request('https://tg-relay.poroshka.ir/healthz');
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
  });

  it('Rejects outbound bot request without X-Relay-Secret header (403)', async () => {
    const req = new Request('https://tg-relay.poroshka.ir/bot123456:ABC/sendMessage', {
      method: 'POST',
      body: JSON.stringify({ chat_id: 123, text: 'hi' })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.error, 'FORBIDDEN_RELAY_SECRET');
  });

  it('Rejects request with incorrect X-Relay-Secret (403)', async () => {
    const req = new Request('https://tg-relay.poroshka.ir/bot123456:ABC/sendMessage', {
      method: 'POST',
      headers: { 'X-Relay-Secret': 'wrong_secret' },
      body: JSON.stringify({ chat_id: 123, text: 'hi' })
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 403);
  });

  it('Returns 404 for unrecognized paths', async () => {
    const req = new Request('https://tg-relay.poroshka.ir/random-path');
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 404);
  });
});
