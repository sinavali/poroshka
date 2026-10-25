---
project_name: "prompt-compiler"
profile: "D"
stack: "node-ts-22-pure"
scope: "shared"
owner: "sinavali"
tier_overrides: []
dr:
  rto: "1h"
  rpo: "15m"
slo:
  tier: "tier-1"
  availability_target: "0.999"
resources:
  cpu_limit: "500m"
  memory_limit: "512Mi"
---

# Project Agent Manifest: prompt-compiler

## 1. Scope & Business Intent
Deterministic template assembly, slot substitution, and atomic block stitching engine. Compiles custom prompts from user options, binds personal memory profiles, and harmonizes multi-block prompt structures with zero runtime LLM cost.

## 2. Architectural Profile & Boundaries
- **Profile**: D (Shared Contracts & Core Libraries)
- **Primary Inputs**: Template strings, slot value mappings, user context profile.
- **Allowed Outbound Dependencies**: `packages/contracts`, `packages/persian-normalizer`.
- **Forbidden Dependencies**: Database drivers, HTTP clients, UI frameworks.

## 3. Local Nx Target Delegations
- `nx lint prompt-compiler` -> `@nx/eslint:lint`
- `nx test prompt-compiler` -> `@nx/vitest:test`
- `nx build prompt-compiler` -> `@nx/js:tsc`
- `nx audit prompt-compiler` -> `python3 scripts/audit-runner.py --scope packages/prompt-compiler`

## 4. Test & Verification Rules
- Line and branch coverage $\ge 95\%$.
- Strict unit tests covering slot priority resolution, `forceFarsiOutput` directives, and slot key de-duplication.
- Zero side-effects and deterministic compilation output.
- Single-turn context ingestion via `ep pack --surface`.

## 5. Approved Tier 2 Deviations
| Rule | Justification | ADR Reference |
|---|---|---|
| *(None)* | Strictly conforms to Profile D invariants | - |

## 6. Project Invariants
- Deterministic compiler output for identical slot and memory bindings.
- Zero runtime LLM calls ($0.00 execution cost).
- Safe slot substitution preventing delimiter injection attacks.
