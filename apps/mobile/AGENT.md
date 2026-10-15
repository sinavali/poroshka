---
project_name: "mobile"
profile: "C"
stack: "react-native-typescript-android"
scope: "mobile"
owner: "sinavali"
tier_overrides: []
---

# Project Agent Manifest: mobile

## 1. Scope & Business Intent
Cross-platform React Native (TypeScript) mobile client targeting Cafe Bazaar, Myket, and Google Play in Iran. Directly shares contracts, normalizers, and compiler logic with web and backend, providing offline-first prompt browsing, hardware-backed personal memory storage, and one-click copy & execute deep-linking.

## 2. Architectural Profile & Boundaries
- **Profile**: C (Mobile Clients - Native & Cross-Platform)
- **Primary Inputs**: User touch gestures, local SQLite cache, push notification intents.
- **Allowed Outbound Dependencies**:
  - `packages/contracts`
  - `packages/persian-normalizer`
  - `packages/prompt-compiler`
  - Backend API (`services/core-api`)
  - Domestic store SDKs (Cafe Bazaar In-App Update, Myket SDK)
- **Forbidden Dependencies**: Hard runtime dependency on Google Play Services (GMS).

## 3. Local Nx Target Delegations
- `nx lint mobile` -> `@nx/eslint:lint`
- `nx test mobile` -> `@nx/vitest:test`
- `nx build mobile` -> `nx:run-commands` (`react-native build-android`)
- `nx audit mobile` -> `python3 scripts/audit-runner.py --scope apps/mobile`

## 4. Test & Verification Rules
- Unidirectional state flow verified via unit and integration tests.
- 4-state UI test coverage (`loading`, `empty`, `loaded`, `failure`).
- Zero hard dependency on Google Play Services; builds cleanly for Cafe Bazaar and Myket.
- Hardware-backed encrypted storage for session tokens via Android Keystore and iOS Keychain.
