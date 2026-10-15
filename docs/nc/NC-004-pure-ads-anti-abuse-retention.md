---
id: "NC-004"
status: "RESOLVED"
created_date: "2026-10-15"
resolved_date: "2026-10-15"
discovered_by: "Antigravity Enterprise Audit"
severity: "blocking"
affected_projects:
  - "services/core-api"
  - "apps/web"
---

# NEED_CLARIFICATION: Pure Ad Commercial Model, Anti-Abuse & Retention Mechanics

## 1. Context & Trigger
Review of user requirements clarified that Promptjoo will operate as a pure ad-supported platform (100% free for end users) rather than a paid subscription service, while requiring high return-visitor retention, a sophisticated admin panel, and robust anti-abuse protection.

## 2. Unresolved Question
How do we balance completely free prompt access with high user retention and zero abuse?

## 3. Options Considered
- **Option A**: Gated subscription model (High friction for organic adoption in Iran).
- **Option B (Selected)**: Pure Ad-Supported Platform with High-Retention Flywheels:
  1. Retention: Personal Memory (`حافظه شخصی من`), Recent Copy Drawer, Favorites.
  2. Anti-Abuse: Self-hosted Altcha PoW on search/compilation, anonymous 15-copy/day limit before requesting free phone registration, MeliPayamak SMS rate-limiting (3/hr per phone), and ad click-fraud deduplication.
  3. Administration: Granular Admin Dashboard for prompt catalog, ad placement rules, and ingestion spend control.

## 4. Resolution & Decision
- **Selected Option**: Option B.
- **Decision Rationale**: Matches the user's business mandate for frictionless virality and high retention with robust operational control.
- **Decided By**: Product Owner & Architect
- **Date Decided**: 2026-10-15
- **Associated ADR**: N/A (Product Strategy)

## 5. Escalation Log
- 2026-10-15: Clarified through interactive design review. Locked in Sections 2.1, 6.1, and 7.1.
