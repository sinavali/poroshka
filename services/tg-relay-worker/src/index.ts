export interface Env {
  RELAY_SECRET: string;
  CORE_API_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Health Probe
    if (path === '/healthz') {
      return new Response(JSON.stringify({ status: 'ok', worker: 'tg-relay-worker' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const relaySecret = env.RELAY_SECRET;
    if (!relaySecret) {
      return new Response(JSON.stringify({ error: 'CONFIG_ERROR', message: 'RELAY_SECRET environment variable is required' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const coreApiUrl = env.CORE_API_URL || 'https://core-api.promptjoo.ir';

    // 2. Outbound Proxy to Telegram Bot API (from core-api)
    if (path.startsWith('/bot')) {
      const authHeader = request.headers.get('X-Relay-Secret');
      if (authHeader !== relaySecret) {
        return new Response(JSON.stringify({ error: 'FORBIDDEN_RELAY_SECRET' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const telegramUrl = `https://api.telegram.org${path}${url.search}`;
      const forwardHeaders = new Headers(request.headers);
      forwardHeaders.delete('X-Relay-Secret');
      forwardHeaders.set('Host', 'api.telegram.org');

      try {
        const tgResponse = await fetch(telegramUrl, {
          method: request.method,
          headers: forwardHeaders,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : null
        });

        return new Response(tgResponse.body, {
          status: tgResponse.status,
          headers: tgResponse.headers
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: 'TELEGRAM_UPSTREAM_ERROR', details: errorMsg }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 3. Inbound Webhook Proxy from Telegram (to core-api)
    if (path.startsWith('/webhook')) {
      const coreWebhookUrl = `${coreApiUrl}/api/v1/campaigns/webhook/telegram`;
      const forwardHeaders = new Headers(request.headers);
      forwardHeaders.set('X-Relay-Secret', relaySecret);

      try {
        const coreResponse = await fetch(coreWebhookUrl, {
          method: 'POST',
          headers: forwardHeaders,
          body: await request.arrayBuffer()
        });

        return new Response(coreResponse.body, {
          status: coreResponse.status,
          headers: coreResponse.headers
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: 'CORE_API_UPSTREAM_ERROR', details: errorMsg }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ error: 'NOT_FOUND' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
