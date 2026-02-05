# ADR 0121: Research & Benchmarking Lab

**Status**: Accepted
**Date**: 2026-02-05
**Plan**: 121 (Research-Benchmarking-Lab)

## Context

MirrorBuddy has 26 AI maestri with distinct teaching styles. We need a systematic way to evaluate and compare their pedagogical quality without relying on real student interactions.

## Decision

Implement a Research Lab with:

1. **Synthetic Students** — 4 neurodivergent profiles (Dyslexia-12yo, ADHD-14yo, ASD-13yo, Mixed-15yo) that simulate realistic student behavior via LLM role-play
2. **Simulation Engine** — orchestrates multi-turn conversations between synthetic students and maestri, capturing per-turn metrics
3. **TutorBench Scoring** — LLM judge evaluates conversations across 4 pedagogical dimensions:
   - Scaffolding (30% weight) — breaking complex into steps
   - Hinting (20% weight) — guiding without giving answers
   - Adaptation (30% weight) — adjusting to student level/DSA
   - Misconception Handling (20% weight) — identifying and correcting errors
4. **Admin Dashboard** — heatmap visualization, experiment management, comparison tools

## Architecture

```
prisma/schema/research.prisma
  ├── SyntheticProfile (stored profile definitions)
  ├── ResearchExperiment (experiment lifecycle)
  └── ResearchResult (per-turn conversation data)

src/lib/research/
  ├── synthetic-students.ts (4 profiles + prompt builder)
  ├── simulation-engine.ts (conversation orchestration)
  ├── benchmarks.ts (TutorBench LLM judge)
  └── experiment-service.ts (lifecycle management)

src/app/api/admin/research/ (admin-only API)
src/app/admin/research/ (dashboard + heatmap)
```

## Key Decisions

- **LLM-as-judge** over rule-based scoring: human-like evaluation of nuanced pedagogical qualities. Temperature 0.1 for consistency.
- **Heuristic + LLM hybrid**: fast regex detectors for scaffolding/adaptation patterns complement the full LLM judge evaluation.
- **No real student data**: all research uses synthetic profiles only. Zero GDPR/COPPA implications.
- **Italian-language profiles**: students respond in Italian matching the platform's primary locale.
- **Weighted scoring**: Scaffolding and Adaptation weighted higher (0.3 each) as they're most critical for neurodivergent learners.

## Consequences

- Can benchmark maestri before deploying prompt changes
- Can compare maestro performance across DSA profiles
- Research data stored separately from production learning data
- Cost: ~2 LLM calls per simulation turn (student + maestro) + 1 judge call per experiment
