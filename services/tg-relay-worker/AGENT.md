---
project_name: "tg-relay-worker"
profile: "A"
stack: "cloudflare-worker-ts"
scope: "backend"
owner: "sinavali"
tier_overrides: []
---

# Project Agent Manifest: tg-relay-worker

## 1. Scope & Business Intent
Cloudflare Worker edge proxy on custom domain (`tg-relay.promptjoo.ir`). Relays outbound requests from `core-api` to Telegram Bot API, and verifies inbound webhooks forwarding them to `core-api`.

## 2. Architectural Profile & Boundaries
- **Profile**: A (Backend & Core Services)
- **Primary Inputs**: Inbound HTTPS requests with `X-Relay-Secret` header; incoming Telegram webhook payloads.
- **Allowed Outbound Dependencies**: Cloudflare Fetch API, `api.telegram.org`, `core-api` webhook receiver.
- **Forbidden Dependencies**: Direct database connections, native Node.js filesystem I/O.

## 3. Local Nx Target Delegations
- `nx lint tg-relay-worker` -> `@nx/eslint:lint`
- `nx test tg-relay-worker` -> `@nx/vitest:test`
- `nx build tg-relay-worker` -> `nx:run-commands` (`wrangler deploy --dry-run`)
- `nx audit tg-relay-worker` -> `python3 scripts/audit-runner.py --scope services/tg-relay-worker`

## 4. Test & Verification Rules
- 100% unit test coverage for secret authentication verification and URL rewrites.
- Mock HTTP tests ensuring malformed or unauthorized requests receive 403 Forbidden without reaching upstream.
