# ADR 0160: Workflow Gap Remediation

| Field  | Value      |
| ------ | ---------- |
| Status | Accepted   |
| Date   | 2026-02-27 |
| Plan   | 263        |
| PR     | TBD        |

## Context

Cross-project analysis of VirtualBPM workflow breakdown report (5 systemic failure patterns) revealed 13 identical gaps across MirrorBuddy's last 5 plans (224, 179, 157, 156, 150). 3 critical gaps were open on main:

1. **A/B Testing dead code** — `injectABMetadata` never called from chat routes (Plan 224 W3, ~14h wasted)
2. **Trend tracking dead code** — `recordBenchmarkTrend`/`detectRegression` never called from nightly benchmark
3. **Community page inaccessible** — user-facing contribution form existed only as unmounted component

Root cause: recurring failure types F1 (spec capture without wiring), F2 (missing integration/migration tasks), F3 (executor follows letter not spirit), F4 (mocks masking real bugs).

## Decision

### Remediate all 13 gaps in a single plan with 6 waves:

| Wave | Purpose                        | Tasks |
| ---- | ------------------------------ | ----- |
| W0   | A/B testing wiring             | 4     |
| W1   | Nightly benchmark trend wiring | 4     |
| W2   | Community user-facing route    | 5     |
| W3   | Crisis pipeline verification   | 3     |
| W4   | Structural CI safeguards       | 5     |
| WF   | Closure (ADR, tests, PR)       | 4     |

### Structural safeguards added to prevent recurrence:

1. **`check-prisma-migration.sh`** — fails PR if schema changed without migration
2. **`check-i18n-namespace.sh`** — fails PR if new locale files not registered
3. **`check-dead-exports.sh`** — warns on orphan exports in `src/lib/`

## Consequences

- A/B testing framework now functional end-to-end
- Nightly benchmarks persist trends and detect regressions
- Community contribution page accessible to users
- Crisis pipeline verified with integration tests
- CI prevents the 3 most common gap patterns (Prisma, i18n, dead code)
- Future plans benefit from automated detection of common oversights
