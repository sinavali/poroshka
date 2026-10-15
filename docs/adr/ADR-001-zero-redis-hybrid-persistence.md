---
id: "ADR-001"
title: "Zero-Redis Hybrid PostgreSQL Persistence Architecture"
status: "Accepted"
date: "2026-10-15"
deciders:
  - "sinavali"
  - "Antigravity"
affected_projects:
  - "services/core-api"
tier_override: true
---

# ADR-001: Zero-Redis Hybrid PostgreSQL Persistence Architecture

## 1. Context and Problem Statement
To minimize operational overhead, maintenance burden, and multi-container state synchronization in Iranian domestic hosting environments, we evaluated whether deploying and operating a standalone Redis cluster is necessary, or if PostgreSQL 16 can natively fulfill session, rate-limiting, and short-lived caching requirements.

## 2. Decision Drivers
- Zero-cost infrastructure footprint with minimum moving parts on domestic VPS/container nodes.
- High crash resilience: user sessions across Iran must survive unexpected container or OS reboots.
- Prevention of dead-tuple index bloat and WAL amplification under high-churn operations.
- Compliance with Tier 1 data integrity and UTC timestamp invariants.

## 3. Considered Options
- **Option 1**: Deploy standalone Redis container alongside PostgreSQL for sessions, rate limits, and OTP challenges.
- **Option 2**: Store all data in regular WAL-logged PostgreSQL tables.
- **Option 3 (Chosen)**: Hybrid PostgreSQL Persistence: Store 30-day user sessions in a persistent WAL-logged table (`auth_sessions`) with 24-hour debounced `last_active_at` writes; place short-TTL OTPs (`otp_challenges`) and rate limits (`rate_limit_buckets`) in autovacuum-tuned `UNLOGGED` tables (`fillfactor = 70`, `scale_factor = 0.02`), swept by a scheduled 5-minute background cleaner.

## 4. Decision Outcome
**Chosen Option**: Option 3. User sessions in `auth_sessions` survive crashes and reboots because the table is WAL-logged. High-frequency ephemeral rate-limit updates bypass WAL write amplification via `UNLOGGED` tables with aggressive autovacuum tuning, backed by an in-process 5-minute cron cleaner.

### Justification for Tier 2 Deviation
This deviates from Tier 2 default (P8 recommendation of Redis for token caching) to eliminate Redis dependency in constrained domestic environments. Risk is mitigated by WAL-logging `auth_sessions` and `idempotency_keys`.

## 5. Consequences

### Positive Consequences
- Zero Redis container overhead, simplifying local Lerd development and production orchestration.
- Immediate transaction consistency between user accounts and session lifecycles.
- Sub-5ms session lookups via primary key index on SHA-256 token hashes.

### Negative Consequences / Trade-Offs
- Rate limit buckets and unconsumed OTP challenges are truncated on unexpected PostgreSQL crashes.
- Requires dedicated background sweeper in `core-api/src/bootstrap/scheduler.ts` to purge expired rows.

## 6. Compliance & Verification Strategy
- **Automated Verification**: Integration tests verify that `auth_sessions` rows survive connection pool restarts, and `scheduler.ts` purges records with `expires_at < NOW()`.
- **Review Checkpoint**: Monitored via `/healthz` database metrics probe.
