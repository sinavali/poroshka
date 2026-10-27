---
project_name: "persian-normalizer"
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

# Project Agent Manifest: persian-normalizer

## 1. Scope & Business Intent
Zero-side-effect Persian (`fa-IR`) text, digit, and ZWNJ normalizer. Normalizes Persian/Arabic digits, unifies Arabic/Persian letter variants (ی/ک), strips conversational stop-words, and detects prompt modality keywords.

## 2. Architectural Profile & Boundaries
- **Profile**: D (Shared Contracts & Core Libraries)
- **Primary Inputs**: Raw Persian/English strings.
- **Allowed Outbound Dependencies**: Zero external dependencies. 100% pure TypeScript functions.
- **Forbidden Dependencies**: Any external npm dependencies or I/O.

## 3. Local Nx Target Delegations
- `nx lint persian-normalizer` -> `@nx/eslint:lint`
- `nx test persian-normalizer` -> `@nx/vitest:test`
- `nx build persian-normalizer` -> `@nx/js:tsc`
- `nx audit persian-normalizer` -> `python3 scripts/audit-runner.py --scope packages/persian-normalizer`

## 4. Test & Verification Rules
- Line and branch coverage $\ge 98\%$.
- Exhaustive test cases for Persian characters, Arabic diacritics, numbers, and modality detection keywords.
- Zero heap allocations during hot-path text normalization.
- Single-turn context ingestion via `ep pack --surface`.

## 5. Approved Tier 2 Deviations
| Rule | Justification | ADR Reference |
|---|---|---|
| *(None)* | Strictly conforms to Profile D invariants | - |

## 6. Project Invariants
- Zero third-party npm runtime dependencies (100% pure standard library).
- Idempotent normalization (`normalize(normalize(text)) === normalize(text)`).
- Complete preservation of Latin substrings and prompt slot placeholders.
