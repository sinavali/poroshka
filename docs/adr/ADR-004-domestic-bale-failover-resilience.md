---
id: "ADR-004"
title: "Dual-Relay Messenger Resilience with Domestic Bale Failover"
status: "Accepted"
date: "2026-10-15"
deciders:
  - "sinavali"
  - "Antigravity"
affected_projects:
  - "services/core-api"
tier_override: false
---

# ADR-004: Dual-Relay Messenger Resilience with Domestic Bale Failover

## 1. Context and Problem Statement
During periods of severe internet censorship or National Information Network (NIN / اینترنت ملی) activation in Iran, international edge services including Cloudflare may experience packet drops or SNI blocking. A single dependency on Telegram Relay creates a single point of failure for verification OTPs and high-priority campaign broadcasts.

## 2. Decision Drivers
- High resilience and zero downtime for messenger communications in Iran.
- Native domestic connectivity with National Information Network infrastructure.
- Automated failover without manual engineering intervention.

## 3. Considered Options
- **Option 1**: Telegram Relay only, accepting delivery delays during international internet disruptions.
- **Option 2**: Eitaa or Rubika private bot protocols (unstable APIs, lack of formal bot webhooks).
- **Option 3 (Chosen)**: Dual-Relay Strategy: Cloudflare Telegram Relay as primary channel, with automatic circuit-breaker failover to **Bale Bot API** (`https://tapi.bale.ai`), which operates 100% inside Iran.

## 4. Decision Outcome
**Chosen Option**: Option 3. If Telegram relay requests fail 3 consecutive times or timeout after 5 seconds, the Outbox worker automatically dispatches pending priority messages to Bale Messenger.

## 5. Consequences

### Positive Consequences
- Guarantees message delivery even during international internet shutdowns.
- Bale has native Iranian user adoption and robust bot API documentation.

### Negative Consequences / Trade-Offs
- Users who only have Telegram may not receive notifications during international shutdowns unless registered with phone SMS.

## 6. Compliance & Verification Strategy
- **Automated Verification**: Outbox worker resilience test verifies that failed Telegram dispatches trip the circuit breaker and route to the Bale adapter.
