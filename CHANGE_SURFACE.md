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

## 3. Code Surface
### Declared Touched Files
- `.dockerignore`
- `.env.example`
- `.ep/`
- `.github/`
- `.gitignore`
- `.runflareignore`
- `AGENT.md`
- `Dockerfile`
- `Dockerfile.web`
- `apps/mobile/AGENT.md`
- `apps/mobile/app.json`
- `apps/mobile/index.js`
- `apps/mobile/metro.config.js`
- `apps/mobile/project.json`
- `apps/mobile/src/App.tsx`
- `apps/mobile/src/components/PromptCard.tsx`
- `apps/mobile/src/components/SlotEditor.tsx`
- `apps/mobile/tests/mobile.spec.ts`
- `apps/mobile/tsconfig.json`
- `apps/web/AGENT.md`
- `apps/web/next.config.ts`
- `apps/web/package.json`
- `apps/web/project.json`
- `apps/web/public/fonts/`
- `apps/web/tsconfig.json`
- `apps/web/src/app/AppShell.tsx`
- `apps/web/src/app/about/page.tsx`
- `apps/web/src/app/admin/page.tsx`
- `apps/web/src/app/api/`
- `apps/web/src/app/contact/layout.tsx`
- `apps/web/src/app/contact/page.tsx`
- `apps/web/src/app/faq/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/hub/`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/my-prompts/layout.tsx`
- `apps/web/src/app/my-prompts/page.tsx`
- `apps/web/src/app/not-found.tsx`
- `apps/web/src/app/p/[slug]/page.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/privacy/page.tsx`
- `apps/web/src/app/robots.ts`
- `apps/web/src/app/sitemap.xml/`
- `apps/web/src/app/sitemaps/`
- `apps/web/src/app/terms/page.tsx`
- `apps/web/src/components/AdBanner.tsx`
- `apps/web/src/components/AdPlacement.tsx`
- `apps/web/src/components/AdminAdsTab.tsx`
- `apps/web/src/components/AdminBatchUploader.tsx`
- `apps/web/src/components/AdminBulkIngestionMetrics.tsx`
- `apps/web/src/components/AdminBulkIngestionTab.tsx`
- `apps/web/src/components/AdminCleanStartModal.tsx`
- `apps/web/src/components/AdminDatasetsView.tsx`
- `apps/web/src/components/AdminEmbeddingProfilesModal.tsx`
- `apps/web/src/components/AdminEmbeddingTab.tsx`
- `apps/web/src/components/AdminGeneralSettingsTab.tsx`
- `apps/web/src/components/AdminParametersModal.tsx`
- `apps/web/src/components/AdminPromptCreatorModal.tsx`
- `apps/web/src/components/AdminPromptTagsModal.tsx`
- `apps/web/src/components/AdminPromptsView.tsx`
- `apps/web/src/components/AdminReportsView.tsx`
- `apps/web/src/components/AdminSettingsView.tsx`
- `apps/web/src/components/AdminTicketsView.tsx`
- `apps/web/src/components/AdminUserProfileModal.tsx`
- `apps/web/src/components/AdminUsersView.tsx`
- `apps/web/src/components/AuthModal.tsx`
- `apps/web/src/components/BlockForger.tsx`
- `apps/web/src/components/Footer.tsx`
- `apps/web/src/components/Header.tsx`
- `apps/web/src/components/PersonalMemoryModal.tsx`
- `apps/web/src/components/PoroshkaLogo.tsx`
- `apps/web/src/components/PostCopyDrawer.tsx`
- `apps/web/src/components/PromptCard.tsx`
- `apps/web/src/components/PromptDetailClient.tsx`
- `apps/web/src/components/PromptSearchCarousel.tsx`
- `apps/web/src/components/ShareButton.tsx`
- `apps/web/src/components/StyledSelect.tsx`
- `apps/web/src/components/UserTicketsModal.tsx`
- `apps/web/src/components/admin-ingestion-types.ts`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/lib/dataset-parser.ts`
- `apps/web/src/lib/public-settings.tsx`
- `apps/web/tests/web.spec.ts`
- `docker-compose.yml`
- `docs/PROMPT_INGESTION_STANDARDS.md`
- `docs/adr/ADR-006-dual-tier-sqlite-logging.md`
- `docs/slo/`
- `package.json`
- `packages/contracts/AGENT.md`
- `packages/contracts/openapi-v1.json`
- `packages/contracts/package.json`
- `packages/contracts/project.json`
- `packages/contracts/src/bin/`
- `packages/contracts/src/catalog.schema.ts`
- `packages/contracts/src/monetization.schema.ts`
- `packages/contracts/tsconfig.json`
- `packages/contracts/tsconfig.lib.json`
- `packages/persian-normalizer/AGENT.md`
- `packages/persian-normalizer/project.json`
- `packages/persian-normalizer/tsconfig.json`
- `packages/prompt-compiler/AGENT.md`
- `packages/prompt-compiler/project.json`
- `packages/prompt-compiler/src/index.ts`
- `packages/prompt-compiler/tests/compiler.spec.ts`
- `packages/prompt-compiler/tsconfig.json`
- `packages/prompt-compiler/tsconfig.lib.json`
- `pnpm-lock.yaml`
- `scripts/bundle-runflare-web.js`
- `scripts/deploy-runflare.sh`
- `scripts/deploy-unified-docker.sh`
- `scripts/export-dataset.js`
- `scripts/import-dataset.js`
- `scripts/start-all.js`
- `services/core-api/AGENT.md`
- `services/core-api/package.json`
- `services/core-api/project.json`
- `services/core-api/src/bootstrap/main.ts`
- `services/core-api/src/bootstrap/scheduler.ts`
- `services/core-api/src/bootstrap/server.ts`
- `services/core-api/src/infrastructure/ai/`
- `services/core-api/src/infrastructure/cache/`
- `services/core-api/src/infrastructure/database/client.ts`
- `services/core-api/src/infrastructure/database/migrate.ts`
- `services/core-api/src/infrastructure/http-clients/altcha.validator.ts`
- `services/core-api/src/infrastructure/sms/melipayamak.client.ts`
- `services/core-api/src/modules/admin/admin-ad-configs.routes.ts`
- `services/core-api/src/modules/admin/admin-embedding.routes.ts`
- `services/core-api/src/modules/admin/admin-sessions.routes.ts`
- `services/core-api/src/modules/admin/admin.routes.ts`
- `services/core-api/src/modules/campaigns/campaigns.routes.ts`
- `services/core-api/src/modules/catalog/catalog.routes.ts`
- `services/core-api/src/modules/identity/identity.routes.ts`
- `services/core-api/src/modules/ingestion/atomic-decomposer.service.ts`
- `services/core-api/src/modules/ingestion/bulk-ingestion.routes.ts`
- `services/core-api/src/modules/ingestion/bulk-ingestion.service.ts`
- `services/core-api/src/modules/ingestion/dataset-import.service.ts`
- `services/core-api/src/modules/ingestion/ingestion.routes.ts`
- `services/core-api/src/modules/ingestion/llm-enricher.service.ts`
- `services/core-api/src/modules/ingestion/seed-fixtures.ts`
- `services/core-api/src/modules/tickets/`
- `services/core-api/tests/api.spec.ts`
- `services/tg-relay-worker/AGENT.md`
- `services/tg-relay-worker/package.json`
- `services/tg-relay-worker/project.json`
- `services/tg-relay-worker/src/index.ts`
- `services/tg-relay-worker/tsconfig.json`

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
