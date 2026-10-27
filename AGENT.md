---
project_name: "promptjoo"
profile: "A"
stack: "node-22-pnpm-nx"
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
  cpu_limit: "2000m"
  memory_limit: "2Gi"
---

# PROMPTJOO — ROOT ENTERPRISE AGENT MANIFEST (`AGENT.md`)

This manifest defines the **Tier-1 Enterprise Inviolables** and root governance policies for all AI coding agents and human engineers contributing to [`promptjoo`](https://github.com/sinavali/promptjoo).

---

## 1. Scope & Business Intent

**Promptjoo** is an ultra-fast, mobile-first multi-modal AI prompt platform for Iran (`fa-IR`), providing curated, slot-customizable prompts for image editing, image generation, writing, code, and audio/video generation with **$0.00 runtime LLM cost** via local vector compilation.

---

## 2. Architectural Profiles & Workspace Topology

The repository is governed as an **Nx Monorepo** partitioned into strictly bounded projects:

| Project | Profile | Tech Stack | Responsibility |
| --- | --- | --- | --- |
| `packages/contracts` | **Profile D** | TypeScript + Zod + OpenAPI 3.0.3 | Canonical DTOs, schemas, and contract generation |
| `packages/persian-normalizer` | **Profile D** | TypeScript (Zero deps) | Zero-side-effect Persian text and digit normalization |
| `packages/prompt-compiler` | **Profile D** | TypeScript | Deterministic prompt slot assembly & block forging |
| `services/core-api` | **Profile A** | Node.js 22 + Hono + Drizzle + PostgreSQL 16 | DDD + Hexagonal backend, Outbox, and Sweeper workers |
| `services/tg-relay-worker` | **Profile A** | Cloudflare Workers + TypeScript | Bidirectional Telegram relay proxy |
| `apps/web` | **Profile B** | Next.js 15 (App Router) + Tailwind CSS | Mobile-first RTL web application & Admin dashboard |
| `apps/mobile` | **Profile C** | React Native 0.76+ (TypeScript) | Cafe Bazaar, Myket & Play Store cross-platform client |

---

## 3. Local Nx Target Delegations

- Root verification: `nx run-many -t lint test build audit`
- Affected check: `nx affected -t lint test build audit`
- Governance verification:
  - `ep preflight`
  - `ep verify`
  - `ep security scan`
  - `ep migration check`
  - `ep codeowners`
  - `ep audit`

---

## 4. Test & Verification Rules

- Deterministic DAG task graph executed through Nx root orchestration.
- Integration tests for databases use real containers or verified database instances.
- Zero-stub guarantee: all error paths, retries, and edge cases fully implemented.
- Strict human-only production merge policy (`ep pr create-prod`).

---

## 5. Tier 1 Enterprise Inviolables (Non-Negotiable)

1. **Single Monorepo Standard:** All code lives in this monorepo orchestrated by Nx (`nx.json`). Standalone satellite repos are forbidden.
2. **Pure Domain Isolation:** Pure domain entities and use cases in `src/domain/` MUST contain zero imports from ORMs, frameworks (Hono, Next.js, Express), or external infrastructure.
3. **Container-Backed Ephemeral Testing:** Integration tests for databases MUST use real `pgvector/pgvector:pg16` containers via Podman / Testcontainers. In-memory emulators (SQLite for Postgres) are strictly forbidden.
4. **Universal UTC Timestamps:** All database timestamps, API payloads, and internal events MUST use UTC ISO-8601 strings (`TIMESTAMPTZ` / `Z`).
5. **Structural Anti-Sprawl Bounds:**
   - File ceiling: soft target $\le 400$ lines; hard mechanical ceiling $\le 800$ lines.
   - Directory depth: $\le 6$ levels relative to each subproject root.
   - Zero generic dumping grounds (`utils`, `helpers`, `common`, `misc` are banned).
6. **Mandatory Idempotency on Mutating Boundaries:** All non-safe HTTP endpoints (`POST`, `PUT`, `DELETE`) enforce UUIDv4 `Idempotency-Key` tracking.
7. **Expand/Contract Database Migrations:** All schema changes must be backward-compatible with zero-downtime deployments.
8. **Automated Mechanical Drift Gates:** Uncommitted schema or contract drift immediately fails CI.

---

## 6. Approved Tier 2 Deviations

| Rule | Justification | ADR Reference |
|---|---|---|
| *(None)* | All subprojects strictly enforce enterprise defaults | - |
