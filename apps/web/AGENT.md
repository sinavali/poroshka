---
project_name: "web"
profile: "B"
stack: "nextjs-15-react-19-tailwind"
scope: "frontend"
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

# Project Agent Manifest: web

## 1. Scope & Business Intent
Mobile-first RTL Next.js 15 (App Router) web application and granular Admin dashboard. Delivers high-speed prompt discovery, interactive slot customizer, 1-click clipboard compilation, personal context memory, SEO/AIO static pages, and admin campaign management.

## 2. Architectural Profile & Boundaries
- **Profile**: B (Web Applications)
- **Primary Inputs**: User browser interactions, AI search engine crawlers (Google, Perplexity, OpenAI).
- **Allowed Outbound Dependencies**:
  - `packages/contracts`
  - `packages/persian-normalizer`
  - `packages/prompt-compiler`
  - Backend API (`services/core-api`)
- **Forbidden Dependencies**: Direct database connections, private backend domain services.

## 3. Local Nx Target Delegations
- `nx lint web` -> `@nx/eslint:lint`
- `nx test web` -> `@nx/vitest:test`
- `nx build web` -> `@nx/next:build`
- `nx audit web` -> `python3 scripts/audit-runner.py --scope apps/web`

## 4. Test & Verification Rules
- 4-State UI coverage (Loading, Empty, Success, Error) on every major view.
- Strict WCAG 2.2 AA accessibility and zero layout shifts (CLS < 0.1).
- Vazirmatn font with tabular digits (`tnum`) and strict `<pre dir="ltr">` bilingual isolation.
- Single-turn context ingestion via `ep pack --surface`.

## 5. Approved Tier 2 Deviations
| Rule | Justification | ADR Reference |
|---|---|---|
| *(None)* | Strictly conforms to Profile B invariants | - |

## 6. Project Invariants
- Zero layout shifts (CLS < 0.1) across all responsive breakpoints.
- Strict hydration safety without unescaped client-only properties.
- All persisted and displayed dates handled via UTC ISO-8601 strings.
