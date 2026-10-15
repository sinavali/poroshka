---
id: "NC-003"
status: "RESOLVED"
created_date: "2026-10-15"
resolved_date: "2026-10-15"
discovered_by: "Antigravity Enterprise Audit"
severity: "blocking"
affected_projects:
  - "services/core-api"
---

# NEED_CLARIFICATION: Idempotency Key Table Persistence Strategy

## 1. Context & Trigger
Section 3.4 of the v1.1.0 draft specified `idempotency_keys` as an `UNLOGGED` table. If the database crashes or restarts, all idempotency keys are truncated, allowing retried mutating requests to execute twice.

## 2. Unresolved Question
Should `idempotency_keys` be stored in an `UNLOGGED` or a regular WAL-logged table?

## 3. Options Considered
- **Option A**: Keep `UNLOGGED` (Risk of duplicate side-effects like SMS billing or account changes upon server crash).
- **Option B (Selected)**: Promote `idempotency_keys` to a standard WAL-logged table with an index on `expires_at` and scheduled 5-minute background sweeping.

## 4. Resolution & Decision
- **Selected Option**: Option B.
- **Decision Rationale**: Mutating HTTP requests are relatively low frequency compared to read traffic; storing idempotency keys in a WAL-logged table guarantees strict Prime Directive P10 compliance and zero duplicate side-effects.
- **Decided By**: Lead Architect
- **Date Decided**: 2026-10-15
- **Associated ADR**: docs/adr/ADR-001-zero-redis-hybrid-persistence.md

## 5. Escalation Log
- 2026-10-15: Identified during v1.1.0 gap analysis. Resolved and locked in Section 3.3.
