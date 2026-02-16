# ADR 0155: Model Comparison Benchmarks

**Status**: Accepted
**Date**: 2026-02-16
**Plan**: 155 (Model-Comparison-Benchmarks)
**References**: ADR 0125 (Research & Benchmarking Lab)

## Context

ADR 0125 introduced the Research Lab with synthetic students and TutorBench scoring. However, when Azure OpenAI releases new model versions (e.g., gpt-5-mini → gpt-5-turbo), we had no systematic way to:

1. Compare pedagogical quality across models before deploying
2. Detect safety regressions when switching models
3. Quantify the cost/quality tradeoff between model tiers

Manual testing was unreliable and inconsistent. We needed an automated, reproducible benchmark pipeline.

## Decision

Extend the Research Lab (ADR 0125) with:

1. **5th Synthetic Profile** — Elena (cerebral palsy, age 11, auditory learner) added to cover motor impairment and complete the 5 DSA profile set
2. **Model Threading** — `SimulationConfig.model` optional field passed to both chatCompletion calls in the simulation engine, enabling per-experiment model selection while maintaining backward compatibility
3. **Safety Benchmark** — Deterministic test suite with 25 curated scenarios across 6 categories (jailbreak, bias, PII, crisis, inappropriate content, age gating) using existing safety modules — no LLM calls required
4. **Model Comparison Engine** — Orchestrator that runs model × maestro × profile combinations, collects TutorBench scores, and generates markdown reports with per-dimension winners

## Architecture

### New Files

```
src/lib/research/
  ├── safety-scenarios.ts          # 25 curated test inputs (6 categories)
  ├── safety-benchmark.ts          # Deterministic runner using safety modules
  ├── model-comparison-types.ts    # Config, result, and model interfaces
  ├── model-comparison.ts          # Comparison orchestrator
  └── comparison-report.ts         # Markdown report generator

src/app/api/admin/research/model-comparison/
  └── route.ts                     # Admin API (GET config, POST run comparison)
```

### Data Flow

```
POST /api/admin/research/model-comparison
  → runModelComparison(config)
    → runSafetyBenchmark() [once, as baseline]
    → for each model × maestro × profile:
        → createExperiment()
        → runExperiment() [passes model to SimulationConfig]
          → runSimulation() [model threaded to chatCompletion]
          → scoreTutorBench()
    → return ModelComparisonResult
  → generateComparisonReport()
  → return { report: markdown, data: structured }
```

## Key Decisions

### Deterministic Safety Tests

Safety scenarios use real safety module functions (filterInput, sanitizeOutput, detectBias, checkAgeGate) deterministically. No LLM calls = fast CI, no flaky tests, reproducible results.

### Mock-Friendly CI

All tests mock chatCompletion and Prisma. The entire test suite runs in <5s without external dependencies. This enables pre-commit validation of the benchmarking infrastructure.

### 125 Combination Matrix

5 models × 5 maestros × 5 profiles = 125 maximum combinations. The API accepts subsets to allow focused comparisons (e.g., 2 models × 1 maestro × 1 profile = 2 experiments for quick checks).

### Backward Compatibility

The `model` field is optional in SimulationConfig. Existing experiments without a model field continue to work exactly as before, using the default Azure deployment.

## Consequences

### Positive

- Can evaluate model changes before deploying to students
- Safety regression detection on every model switch
- Quantitative cost/quality data for model selection decisions
- Complete DSA profile coverage (5 profiles for all supported conditions)

### Negative

- Full 125-combination runs are expensive (Azure API costs)
- Safety scenarios need periodic review as new attack patterns emerge
- Report generator is static markdown — no interactive dashboard (future work)

### Risks

- Safety scenarios may not cover all real-world attack vectors
- TutorBench LLM judge scoring may vary between judge model versions
