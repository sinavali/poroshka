---
id: "NC-002"
status: "RESOLVED"
created_date: "2026-10-15"
resolved_date: "2026-10-15"
discovered_by: "Antigravity Enterprise Audit"
severity: "blocking"
affected_projects:
  - "services/core-api"
---

# NEED_CLARIFICATION: Crash Resilience & Autovacuum Tuning of Redis-Free State

## 1. Context & Trigger
Initial draft placed all ephemeral state, including 30-day user sessions (`auth_sessions`), in PostgreSQL `UNLOGGED` tables. In PostgreSQL, `UNLOGGED` tables are completely truncated on crash recovery or reboot.

## 2. Unresolved Question
How do we preserve 30-day persistent user login sessions without Redis while avoiding WAL write amplification on high-churn rate limits?

## 3. Options Considered
- **Option A**: Keep `auth_sessions` in `UNLOGGED` table (Unacceptable: reboots log out all users across Iran).
- **Option B**: Deploy a separate Redis container (Adds operational overhead in domestic environments).
- **Option C (Selected)**: Promote `auth_sessions` to a persistent WAL-logged table with 24-hour debounced `last_active_at` writes; restrict `UNLOGGED` tables to genuinely disposable short-TTL records (`otp_challenges`, `rate_limit_buckets`) with custom autovacuum tuning and a scheduled 5-minute background cleaner.

## 4. Resolution & Decision
- **Selected Option**: Option C.
- **Decision Rationale**: Balances crash resilience for authenticated users with zero-WAL performance for sliding-window rate limit counters.
- **Decided By**: Lead Architect
- **Date Decided**: 2026-10-15
- **Associated ADR**: docs/adr/ADR-001-zero-redis-hybrid-persistence.md

## 5. Escalation Log
- 2026-10-15: Identified during enterprise audit. Resolved and locked in ADR-001 and Section 3.1.
