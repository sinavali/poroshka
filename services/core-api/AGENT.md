---
project_name: "core-api"
profile: "A"
stack: "node-22-hono-drizzle-pgvector"
scope: "backend"
owner: "sinavali"
tier_overrides: []
dr:
  rto: "1h"
  rpo: "15m"
slo:
  tier: "tier-1"
  availability_target: "0.999"
resources:
  cpu_limit: "1000m"
  memory_limit: "1Gi"
---

# Project Agent Manifest: core-api

## 1. Scope & Business Intent
Core backend service implementing Domain-Driven Design (DDD) and Hexagonal Architecture. Governs catalog search, vector indexing, multi-dataset ingestion, identity & sessions, ad monetization, and transactional outbox broadcasts.

## 2. Architectural Profile & Boundaries
- **Profile**: A (Backend & Core Services)
- **Primary Inputs**: Inbound REST HTTP endpoints (Hono), internal Outbox/Ingestion worker loops, background sweeper cron.
- **Allowed Outbound Dependencies**:
  - `packages/contracts`
  - `packages/persian-normalizer`
  - `packages/prompt-compiler`
  - PostgreSQL 16 (`pgvector`)
  - ArvanCloud S3 and `bge-m3` embedding API
  - AvalAI enrichment API (offline ingestion only)
  - MeliPayamak SMS API and Bale Bot API
- **Forbidden Dependencies**: Direct UI imports from `apps/*`. Pure domain layer (`src/modules/*/domain/`) MUST NOT import ORMs, Hono, or database connection clients.

## 3. Local Nx Target Delegations
- `nx lint core-api` -> `@nx/eslint:lint`
- `nx test core-api` -> `@nx/vitest:test`
- `nx test:integration core-api` -> `@nx/vitest:test` (via Testcontainers)
- `nx build core-api` -> `@nx/esbuild:esbuild`
- `nx audit core-api` -> `python3 scripts/audit-runner.py --scope services/core-api`

## 4. Test & Verification Rules
- Pure domain unit tests located in `tests/` and domain unit suites (Fast, in-process, zero I/O).
- Integration tests $\ge 80\%$ coverage using real `pgvector/pgvector:pg16` Testcontainers.
- In-memory SQL emulators (SQLite for Postgres) are strictly forbidden.
- All stored and API timestamps use UTC ISO-8601 (`TIMESTAMPTZ` / `Z`).
- Single-turn context ingestion via `ep pack --surface`.

## 5. Approved Tier 2 Deviations
| Rule | Justification | ADR Reference |
|---|---|---|
| *(None)* | Strictly conforms to Profile A invariants | - |

## 6. Project Invariants
- Aggregate roots enforce transactional boundary.
- Transactional Outbox pattern mandatory for all asynchronously broadcast domain events.
- Zero-stub guarantee: all error paths, retries, and edge cases fully implemented.
