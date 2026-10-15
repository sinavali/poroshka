---
project_name: "contracts"
profile: "D"
stack: "node-ts-22-zod-openapi"
scope: "shared"
owner: "sinavali"
tier_overrides: []
---

# Project Agent Manifest: contracts

## 1. Scope & Business Intent
Canonical schema definitions, data transfer objects (DTOs), and contract export pipelines. Single source of truth for all API payloads and validation schemas used across backend, web, and mobile.

## 2. Architectural Profile & Boundaries
- **Profile**: D (Shared Contracts & Core Libraries)
- **Primary Inputs**: TypeScript Zod schema definitions with `@asteasolutions/zod-to-openapi`.
- **Allowed Outbound Dependencies**: Zero runtime framework dependencies. Emits OpenAPI 3.0.3 specification.
- **Forbidden Dependencies**: Direct imports from `apps/*` or `services/*`.

## 3. Local Nx Target Delegations
- `nx lint contracts` -> `@nx/eslint:lint`
- `nx test contracts` -> `@nx/vitest:test`
- `nx build contracts` -> `@nx/js:tsc`
- `nx audit contracts` -> `python3 scripts/audit-runner.py --scope packages/contracts`

## 4. Test & Verification Rules
- 100% test coverage for schema parsing and serialization invariants.
- Automated CI drift check comparing `openapi-v1.json` with generated Dart DTOs.
- Timestamps strictly validated as ISO-8601 UTC strings.
