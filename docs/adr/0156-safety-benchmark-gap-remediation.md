# ADR 0156: Safety Benchmark Gap Remediation

**Status**: Accepted
**Date**: 2026-02-16
**Plan**: 156 (Safety-Gaps-Fix-And-Model-Comparison)
**References**: ADR 0004 (Safety Guardrails), ADR 0062 (AI Compliance), ADR 0115 (Amodei Safety), ADR 0155 (Model Comparison Benchmarks)

## Context

ADR 0155 introduced the safety benchmark system with 25 curated test scenarios across 6 categories. Running the benchmark revealed an **initial pass rate of only 68%** (17/25), with critical gaps in Italian-language pattern detection.

### Gaps Found

| Category       | Pass Rate | Failures | Root Cause                                                       |
| -------------- | --------- | -------- | ---------------------------------------------------------------- |
| Jailbreak      | 100%      | 0        | —                                                                |
| PII            | 100%      | 0        | —                                                                |
| **Bias**       | **25%**   | **3**    | Italian bias phrases not in regex patterns                       |
| **Crisis**     | **33%**   | **2**    | `includes()` matching too exact — "non voglio più vivere" missed |
| **Content**    | **50%**   | **2**    | No weapon-variant or hacking patterns                            |
| **Age Gating** | **80%**   | **1**    | Missing `health_substances` ContentTopic                         |

Additional finding: MirrorBuddy supports 5 locales (IT/EN/FR/DE/ES) but safety patterns only covered IT and EN partially.

## Decision

### 1. Crisis Detection — Regex Upgrade (P0)

Converted `containsCrisisKeywords()` from `string.includes()` to **regex matching**, enabling flexible patterns that handle word insertions (e.g., "non voglio **più** vivere"). Extended to all 5 locales.

**File**: `src/lib/safety/crisis-detection.ts`

### 2. Bias Detection — Italian Pattern Expansion (P0)

Added Italian patterns for:

- **Gender**: "non sono brave in" (catches "Le ragazze non sono brave in matematica")
- **Disability**: "con disabilità non possono imparare" (flexible regex)
- **Socioeconomic**: "solo i ricchi possono" (wealth-based exclusion)

Added compact multilingual patterns for FR/DE/ES.

**File**: `src/lib/safety/bias-detector-patterns.ts`

### 3. Content Filter — Weapons + Hacking (P1)

Added `VIOLENCE_PATTERNS` entries: "costruire bomba", "bomba artigianale", "fabbricare arma".
Created `HACKING_PATTERNS` array: "hackerare", "violare sistema", "craccare" + EN/FR/DE/ES.

**Important**: Fixed in BOTH `content-filter/patterns.ts` AND `content-filter-patterns.ts` (dual-copy architecture).

**Files**: `src/lib/safety/content-filter/patterns.ts`, `src/lib/safety/content-filter-patterns.ts`, `src/lib/safety/content-filter-core.ts`

### 4. Age Gating — health_substances Topic (P2)

Added `health_substances` to `ContentTopic` union with sensitivity: `blocked` (elementary), `restricted` (middle), `moderate` (highschool), `safe` (adult).

**Important**: Fixed in BOTH `age-gating/types.ts` + `age-gating-types.ts` AND `age-gating/topic-matrix.ts` + `age-gating-matrix.ts` (dual-copy architecture).

## Results

| Metric            | Before                     | After                     |
| ----------------- | -------------------------- | ------------------------- |
| Pass Rate         | 68% (17/25)                | **100% (25/25)**          |
| Languages Covered | IT, EN (partial)           | **IT, EN, FR, DE, ES**    |
| Safety Tests      | 878                        | **896 + 18 = 914**        |
| Crisis Patterns   | 12 (IT only, string match) | **48 (5 locales, regex)** |

## Architectural Note: Dual-Copy Pattern

This project has parallel flat files (`age-gating-*.ts`, `content-filter-patterns.ts`) and module directories (`age-gating/*.ts`, `content-filter/*.ts`). The barrel `@/lib/safety` imports from the flat files, while internal module imports use the directory structure. **Both copies must be updated** when adding patterns.

## Consequences

### Positive

- All 25 safety scenarios now pass deterministically
- 5-language coverage for crisis, bias, and content detection
- Quantifiable safety baseline for model comparison benchmarks
- EU AI Act Art. 10 compliance improved (bias detection)

### Negative

- Dual-copy architecture increases maintenance burden
- Regex patterns may produce false positives on edge cases
- Pattern-based detection has inherent coverage limits vs. LLM-based detection
