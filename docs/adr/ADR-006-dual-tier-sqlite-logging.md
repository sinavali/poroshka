---
id: "ADR-006"
title: "Dual-Tier Local SQLite Logging and Remote PostgreSQL Persistence"
status: "Accepted"
date: "2026-10-15"
deciders:
  - "sinavali"
  - "Antigravity"
affected_projects:
  - "services/core-api"
tier_override: false
---

# ADR-006: Dual-Tier Local SQLite Logging and Remote PostgreSQL Persistence

## 1. Context and Problem Statement
High-volume HTTP request logs, search queries, and audit traces can saturate network bandwidth and storage IOPS on remote managed databases. We need an architecture that keeps remote PostgreSQL focused on relational entities and vectors, while retaining rich local logs.

## 2. Decision Drivers
- Bandwidth and connection pool conservation on remote PostgreSQL (`remote-respina-free.runflare.com:31725/promptjoo_db`).
- High-velocity local logging without network latency.
- Structured, queryable log analytics using local SQLite.

## 3. Considered Options
- **Option 1**: Log everything directly into remote PostgreSQL tables (high bandwidth cost and table bloat).
- **Option 2**: Plain text log files only (difficult to query and filter for admin analytics).
- **Option 3 (Chosen)**: Dual-Tier Persistence: Remote PostgreSQL stores core entities, vector embeddings, sessions, and ad campaigns. A local SQLite database (`data/logs.sqlite`) stores structured high-frequency access logs, audit events, and scraper detection traces.

## 4. Decision Outcome
**Chosen Option**: Option 3. Uses embedded SQLite (`better-sqlite3` in WAL mode) for zero-latency local log append and queryability, keeping remote PostgreSQL optimized for fast vector search and transactions.

## 5. Consequences
### Positive Consequences
- Zero network roundtrips for logging; logging never blocks client requests.
- Preserves remote database storage and memory for `pgvector` HNSW index caching.
### Negative Consequences / Trade-Offs
- Logs are tied to the local container volume and require standard log rotation or archival.

## 6. Compliance & Verification Strategy
- **Automated Verification**: Integration tests verify that HTTP request logs write to local SQLite without issuing remote PostgreSQL queries.
