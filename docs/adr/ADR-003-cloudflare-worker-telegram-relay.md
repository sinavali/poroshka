---
id: "ADR-003"
title: "Bidirectional Telegram Relay via Cloudflare Worker on Custom Domain"
status: "Accepted"
date: "2026-10-15"
deciders:
  - "sinavali"
  - "Antigravity"
affected_projects:
  - "services/tg-relay-worker"
  - "services/core-api"
tier_override: false
---

# ADR-003: Bidirectional Telegram Relay via Cloudflare Worker on Custom Domain

## 1. Context and Problem Statement
Telegram Bot API (`api.telegram.org`) is blocked in Iran by domestic telecommunications filters. Backend services hosted inside Iran cannot directly invoke Telegram APIs or receive inbound webhooks without a resilient, secure reverse proxy.

## 2. Decision Drivers
- Zero-cost proxy infrastructure ($0/month on Cloudflare free tier).
- Secure bidirectional relay: proxying outbound `core-api` requests and routing inbound Telegram webhook updates.
- Strong authentication: preventing unauthorized third parties from using the proxy.

## 3. Considered Options
- **Option 1**: Rent foreign VPS (e.g. Hetzner Germany) solely for proxying Telegram traffic ($5–10/month).
- **Option 2**: Run local Shadowsocks / V2Ray client on the production server (brittle, frequent IP blocks).
- **Option 3 (Chosen)**: Cloudflare Worker on custom domain (`tg-relay.promptjoo.ir`) verifying `X-Relay-Secret` header on outbound calls and forwarding webhook payloads to `core-api/api/v1/campaigns/webhooks/telegram`.

## 4. Decision Outcome
**Chosen Option**: Option 3. Provides global edge availability, zero hosting cost, automated SSL termination, and sub-100ms proxying.

## 5. Consequences

### Positive Consequences
- Zero server maintenance; auto-scales to millions of webhook updates.
- End-to-end secret verification prevents proxy abuse.

### Negative Consequences / Trade-Offs
- Cloudflare IP ranges can occasionally face domestic SNI throttling during severe internet disruption events (addressed by ADR-004 domestic Bale failover).

## 6. Compliance & Verification Strategy
- **Automated Verification**: Mock HTTP tests in `services/tg-relay-worker` verify secret verification, and contract integration tests verify webhook forwarding.
