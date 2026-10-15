---
title: "Change Surface: Phase 1 Workspace Governance, Tooling & Profile D Contracts"
author: "Antigravity Agent"
created_date: "2026-10-15"
target_branch: "main"
risk_level: "LOW"
affected_projects:
  - "packages/contracts"
  - "packages/persian-normalizer"
  - "packages/prompt-compiler"
  - "services/core-api"
  - "services/tg-relay-worker"
  - "apps/web"
  - "apps/mobile"
---

# Change Surface: Phase 1 Workspace Governance, Tooling & Profile D Contracts

## 1. Intent & Business Rationale
Bootstrap the canonical enterprise monorepo workspace for Promptjoo according to specification `promptjoo.md v1.2.0`. This establishes mechanical governance, root Nx configuration, subproject AGENT manifests, validation scripts, ADRs (ADR-001 to ADR-006), NC records (NC-001 to NC-004), remote PostgreSQL 18.1 integration, local SQLite logging, and shared Profile D libraries (`persian-normalizer`, `prompt-compiler`, and `contracts`).

## 2. Affected Monorepo Projects
| Project Path | Architectural Profile | Responsibility in this Change |
| --- | --- | --- |
| `packages/contracts` | Profile D (Contracts) | Canonical Zod DTOs shared directly across backend, web, and mobile |
| `packages/persian-normalizer` | Profile D (Shared Library) | Pure zero-side-effect Persian text/digit normalizer |
| `packages/prompt-compiler` | Profile D (Shared Library) | Deterministic slot compiler and atomic block stitcher |
| `services/core-api` | Profile A (Backend) | Project manifest and remote PostgreSQL + local SQLite logging targets |
| `services/tg-relay-worker` | Profile A (Edge Relay) | Project manifest and Cloudflare Worker targets |
| `apps/web` | Profile B (Web) | Project manifest and Next.js targets |
| `apps/mobile` | Profile C (Mobile) | Project manifest and React Native TypeScript targets |

## 3. Code Surface (Targeted Symbols & Files)

### Added Files
- `nx.json`: Root Nx DAG configuration and task targets.
- `package.json`: Monorepo root workspace dependencies and scripts.
- `pnpm-workspace.yaml`: pnpm monorepo workspace package declarations.
- `.pre-commit-config.yaml`: Mechanical compliance hooks for commits.
- `docs/adr/ADR-001-zero-redis-hybrid-persistence.md`: Hybrid persistence architecture decision.
- `docs/adr/ADR-002-zero-runtime-llm-block-forging.md`: Zero-LLM block forging architecture decision.
- `docs/adr/ADR-003-cloudflare-worker-telegram-relay.md`: Cloudflare Telegram relay proxy decision.
- `docs/adr/ADR-004-domestic-bale-failover-resilience.md`: Domestic Bale failover resilience decision.
- `docs/adr/ADR-005-react-native-code-sharing.md`: React Native mobile client code sharing decision.
- `docs/adr/ADR-006-dual-tier-sqlite-logging.md`: Dual-tier local SQLite logging decision.
- `docs/nc/NC-001-zod-to-dart-openapi-pipeline.md`: Direct TypeScript sharing for mobile record.
- `docs/nc/NC-002-ephemeral-vs-persistent-auth-state.md`: Redis-free ephemeral state record.
- `docs/nc/NC-003-idempotency-key-wal-persistence.md`: Idempotency key persistence record.
- `docs/nc/NC-004-pure-ads-anti-abuse-retention.md`: Pure ad model and retention record.
- `packages/contracts/project.json`: Contracts Nx target definitions.
- `packages/contracts/AGENT.md`: Profile D contracts manifest.
- `packages/persian-normalizer/project.json`: Persian normalizer Nx target definitions.
- `packages/persian-normalizer/AGENT.md`: Profile D normalizer manifest.
- `packages/prompt-compiler/project.json`: Prompt compiler Nx target definitions.
- `packages/prompt-compiler/AGENT.md`: Profile D prompt compiler manifest.
- `services/core-api/project.json`: Core API Nx target definitions.
- `services/core-api/AGENT.md`: Profile A core API manifest.
- `services/tg-relay-worker/project.json`: Telegram relay worker Nx target definitions.
- `services/tg-relay-worker/AGENT.md`: Profile A edge manifest.
- `apps/web/project.json`: Web application Nx target definitions.
- `apps/web/AGENT.md`: Profile B web manifest.
- `apps/mobile/project.json`: Mobile React Native app Nx target definitions.
- `apps/mobile/AGENT.md`: Profile C mobile manifest.

### Modified Files
- `promptjoo.md`: Master Source of Truth specification upgraded with remote database, local SQLite logging, and React Native mobile stack.

## 4. Test Surface

### Unit & Domain Tests
- `packages/persian-normalizer/tests/normalizer.spec.ts`: Verify Persian/Arabic digit conversion, ZWNJ normalization, and stop-word stripping.
- `packages/prompt-compiler/tests/compiler.spec.ts`: Verify slot substitution priority, forceFarsiOutput directive insertion, and slot de-duplication.

### Integration Tests
- `packages/contracts/tests/contracts.test.ts`: Verify shared Zod contracts validate identically across Node and client targets.

### Governance Verification Scripts
- `python3 scripts/verify-nx-targets.py --root .`: Verifies all 7 project.json files define mandatory targets and tags.
- `python3 scripts/verify-agent-manifests.py --root .`: Verifies all AGENT.md files implement required frontmatter and sections.
- `python3 scripts/check-nc-items.py --dir docs/nc --max-age 14`: Verifies all 4 NC items are resolved without aged blockers.
- `python3 scripts/validate-change-surface.py CHANGE_SURFACE.md`: Verifies structural compliance of this Change Surface.

## 5. Invariants & Non-Negotiables Preserved
- [x] Tier 1: Pure domain logic remains 100% free of framework or ORM imports.
- [x] Tier 1: Real container / real PostgreSQL integration tests (no engine-substitution emulators like SQLite for Postgres).
- [x] Tier 1: All stored and wire timestamps use UTC ISO-8601 (Z).
- [x] Tier 1: Directory nesting depth does not exceed 6 levels from project root.
- [x] Tier 1: Database migrations follow Expand/Contract pattern for zero-downtime rollout.
- [x] Tier 2: Files respect size ceilings (<= 800 lines hard, <= 400 lines soft); no micro-file sprawl.
- [x] Tier 2: Domain test coverage maintains >= 95% line & branch coverage; adapters >= 80%.
- [x] Tier 2: Transactional outbox pattern used for domain events published to brokers.
- [x] Tier 2: Backward compatibility of existing API contracts preserved.

## 6. Risk Matrix & Rollback Strategy
| Risk Description | Probability | Impact | Mitigation Strategy |
| --- | --- | --- | --- |
| Remote PostgreSQL connectivity drops | Low | High | Connection pooling with automated reconnect and retry in Drizzle adapter |
| React Native Android build flavor drift | Low | Medium | Standardized Gradle flavor configuration for Bazaar and Myket |

### Rollback Strategy
All changes in Phase 1 are additive workspace governance files. In case of issues, git revert HEAD cleanly restores the initial workspace state.
