---
id: "ADR-002"
title: "Zero-Runtime-LLM Prompt Forging via Atomic Block Vectors"
status: "Accepted"
date: "2026-10-15"
deciders:
  - "sinavali"
  - "Antigravity"
affected_projects:
  - "packages/prompt-compiler"
  - "services/core-api"
tier_override: false
---

# ADR-002: Zero-Runtime-LLM Prompt Forging via Atomic Block Vectors

## 1. Context and Problem Statement
Generating custom prompts dynamically on user demand typically requires calling runtime LLMs (e.g. OpenAI/Anthropic), which introduces significant API costs, latency ($1–3\text{s}$), and vulnerability to internet throttling in Iran. We need a system that can forge high-quality, tailored prompts in real-time with $0.00 runtime LLM expenditure and sub-$25\text{ms}$ response times.

## 2. Decision Drivers
- Zero runtime LLM operational cost ($0.00 per prompt copy/generation).
- Instantaneous user responsiveness ($<15\text{ms}$ prompt assembly).
- Semantic coherence: preventing mismatched roles and tasks during assembly.
- Offline enrichability: utilizing cheap batch inference during ingestion rather than user-facing runtime.

## 3. Considered Options
- **Option 1**: Call DeepSeek/AvalAI API at runtime for each user request ($0.002 per prompt, 1500ms latency).
- **Option 2**: Static catalog templates only without dynamic customization.
- **Option 3 (Chosen)**: Atomic Block Vector Stitching: Decompose prompts offline during ingestion into `ROLE`, `TASK`, `CONSTRAINT`, and `FORMAT` blocks with 1024-d `bge-m3` vectors. At runtime, perform a modality-scoped nearest-neighbor search via `pgvector` to retrieve the best 4 blocks, and assemble them in client memory in $<5\text{ms}$.

## 4. Decision Outcome
**Chosen Option**: Option 3. Produces modular, highly accurate prompts tailored to user context without runtime LLM invocations.

## 5. Consequences

### Positive Consequences
- Zero runtime API cost; 100% immune to upstream LLM downtime or rate limits.
- Sub-15ms response latency, delivering instant UX.
- Slot variables harmonize seamlessly with user personal memory profiles (`حافظه شخصی من`).

### Negative Consequences / Trade-Offs
- Requires offline extraction of atomic blocks during dataset ingestion.
- Modality scoping is strictly required to prevent semantic domain clashes.

## 6. Compliance & Verification Strategy
- **Automated Verification**: Unit tests in `packages/prompt-compiler` verify deterministic block assembly and slot variable de-duplication. Integration tests verify HNSW block vector retrieval.
