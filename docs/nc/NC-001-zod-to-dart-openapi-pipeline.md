---
id: "NC-001"
status: "RESOLVED"
created_date: "2026-10-15"
resolved_date: "2026-10-15"
discovered_by: "Antigravity Enterprise Audit"
severity: "blocking"
affected_projects:
  - "packages/contracts"
  - "apps/mobile"
---

# NEED_CLARIFICATION: Cross-Platform Mobile Client Stack & Codebase Sharing

## 1. Context & Trigger
Initial draft specified Flutter (Dart), which necessitated a secondary OpenAPI-to-Dart translation pipeline (`swagger_parser`) and duplicated prompt compilation logic in Dart. The user requested switching to React Native (TypeScript) if it supports Cafe Bazaar, Myket, and Google Play, in order to maximize codebase sharing.

## 2. Unresolved Question
Does React Native meet enterprise Profile C requirements and publish cleanly to Iranian app stores (Cafe Bazaar & Myket) while sharing TypeScript packages directly?

## 3. Options Considered
- **Option A**: Retain Flutter (Dart) with separate Dart models and compilation engine.
- **Option B (Selected)**: Lock Profile C mobile client to **React Native (TypeScript)**.
  - 100% direct TypeScript sharing with `packages/contracts`, `packages/persian-normalizer`, and `packages/prompt-compiler`.
  - Produces standard Android APKs and AABs published to Cafe Bazaar, Myket, and Google Play.
  - Encrypted storage via hardware Keystore / Keychain and SQLite.

## 4. Resolution & Decision
- **Selected Option**: Option B.
- **Decision Rationale**: Eliminates all cross-language translation drift, achieves maximum code reuse across web and mobile, and delivers native Android performance on Cafe Bazaar and Myket.
- **Decided By**: Product Owner & Architect
- **Date Decided**: 2026-10-15
- **Associated ADR**: docs/adr/ADR-005-react-native-code-sharing.md

## 5. Escalation Log
- 2026-10-15: Clarified and locked with user approval. Resolved in ADR-005.
