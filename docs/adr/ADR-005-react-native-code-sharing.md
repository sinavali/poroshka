---
id: "ADR-005"
title: "React Native Mobile Client for Universal TypeScript Code Sharing"
status: "Accepted"
date: "2026-10-15"
deciders:
  - "sinavali"
  - "Antigravity"
affected_projects:
  - "apps/mobile"
  - "packages/contracts"
  - "packages/persian-normalizer"
  - "packages/prompt-compiler"
tier_override: false
---

# ADR-005: React Native Mobile Client for Universal TypeScript Code Sharing

## 1. Context and Problem Statement
Initial drafts designated Flutter (Dart) for `apps/mobile`. However, Flutter required maintaining an OpenAPI-to-Dart translation pipeline (`swagger_parser`), duplicate domain models, and duplicate prompt compiler logic. The user mandated switching to React Native (TypeScript) if it supports Cafe Bazaar, Myket, and code sharing.

## 2. Decision Drivers
- 100% direct TypeScript code sharing: `apps/mobile` can import `packages/contracts`, `packages/persian-normalizer`, and `packages/prompt-compiler` directly without translation layers or schema drift.
- Full compatibility with Iranian Android app stores: Cafe Bazaar and Myket natively support React Native standard APK and AAB packages.
- Native performance with Hermes engine and React Native new architecture.

## 3. Considered Options
- **Option 1**: Retain Flutter (Dart) requiring Zod -> OpenAPI 3.0.3 -> Dart generator pipeline.
- **Option 2 (Chosen)**: React Native (TypeScript) under Profile C. Imports shared contracts and compiler logic directly; produces native Android release builds for Cafe Bazaar, Myket, and Google Play.

## 4. Decision Outcome
**Chosen Option**: Option 2. Eliminates cross-language DTO translation overhead and guarantees zero logic duplication between web and mobile prompt compilation.

## 5. Consequences
### Positive Consequences
- Zero code duplication: compilation and normalization algorithms run identically on web, backend, and mobile.
- Instant contract updates: modifying a Zod schema in `packages/contracts` immediately type-checks across both `apps/web` and `apps/mobile`.
### Negative Consequences / Trade-Offs
- Requires configuring Android native Gradle flavors (`bazaar`, `myket`, `direct`) in React Native Android project.

## 6. Compliance & Verification Strategy
- **Automated Verification**: TypeScript compilation and Jest/Vitest unit tests verify direct imports from `packages/*`.
