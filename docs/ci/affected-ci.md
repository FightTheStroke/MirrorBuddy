# Affected-Based CI Pipeline

MirrorBuddy CI uses **change detection** to skip expensive jobs when they are
not relevant to a PR, while maintaining full verification on push to `main`.

## How It Works

A `detect-changes` job runs first using
[dorny/paths-filter](https://github.com/dorny/paths-filter) to classify
the changed files into areas:

| Area     | Paths                                                                                        |
| -------- | -------------------------------------------------------------------------------------------- |
| `src`    | `src/**`, `public/**`                                                                        |
| `ui`     | `src/app/**`, `src/components/**`, `src/styles/**`, `public/**`, `messages/**`               |
| `mobile` | `ios/**`, `android/**`, `capacitor.config.ts`, `src/lib/native/**`                           |
| `prisma` | `prisma/**`                                                                                  |
| `i18n`   | `messages/**`, `src/i18n/**`, `src/lib/i18n/**`                                              |
| `safety` | `src/lib/safety/**`, `src/lib/ai/**`, `src/lib/privacy/**`, `src/lib/compliance/**`          |
| `e2e`    | `e2e/**`, `playwright.config*.ts`                                                            |
| `config` | `package.json`, `tsconfig*`, `eslint.config.mjs`, `eslint-local-rules/**`, `.github/**` etc. |
| `docs`   | `docs/**`, `*.md`                                                                            |

## What Always Runs on PR (Blocking)

These jobs run on **every** PR regardless of what changed:

| Job                   | Why                                  |
| --------------------- | ------------------------------------ |
| `build`               | Validates compilation                |
| `unit-tests`          | Full unit test suite + coverage      |
| `smoke-tests`         | Critical user flow E2E               |
| `secret-scanning`     | Secrets in any file type             |
| `security`            | SBOM + env file safety               |
| `llm-safety-tests`    | Jailbreak/content filter regression  |
| `quality`             | TODOs, console.log, circular imports |
| `accessibility-tests` | WCAG 2.1 AA compliance (smart mode)  |

## Conditional Jobs on PR

These jobs are **skipped** when the affected area is not touched:

| Job            | Runs When                 | Skipped When         |
| -------------- | ------------------------- | -------------------- |
| `debt-check`   | `src` or `config` changed | docs-only, ci-only   |
| `migrations`   | `prisma` changed          | no schema changes    |
| `mobile-smoke` | `ui` or `mobile` changed  | backend-only changes |
| `mobile-build` | `mobile` or `src` changed | docs-only changes    |

Skipped jobs report `skipped` status. The PR gate treats `skipped` as
acceptable for conditional jobs (but not for required jobs).

## Smart Accessibility Testing

Accessibility is **never skipped** but adapts to the change scope:

- **UI changes detected** (`ui == true`) or **push to main**: Full Playwright
  `--project=a11y` E2E suite.
- **No UI changes** (backend, docs, config): Fast a11y unit test baseline
  (`npm run test:unit -- accessibility`). Validates the a11y module logic
  without expensive browser overhead.

## Push to Main (Deployment Gate)

On push to `main`, **all** jobs run unconditionally (no skipping). This ensures
the deployment gate has complete verification before deploying to production.

## Adding a New Area

1. **Add filter** in `detect-changes` job (`dorny/paths-filter` config):
   ```yaml
   my_area:
     - "src/lib/my-area/**"
   ```
2. **Export output**: Add to `outputs:` in the `detect-changes` job.
3. **Add condition**: In the job(s) that should be conditional:
   ```yaml
   if: >
     github.event_name != 'pull_request' ||
     needs.detect-changes.outputs.my_area == 'true'
   ```
4. **Update PR gate**: If the job is already in the gate `needs` list, add it
   to the conditional check (allow `skipped`). If new, add to `needs` and
   choose required vs conditional.

## Debugging Path Filters

To see what `dorny/paths-filter` detected, check the `detect-changes` job
output in the GitHub Actions run log. Each area shows `true` or `false`.

Locally, simulate with:

```bash
./scripts/test-affected.sh --dry-run
```

## Module Boundaries (ESLint)

Protected domain modules enforce barrel-export-only imports via the
`enforce-module-boundaries` ESLint rule. Cross-module deep imports are **errors**
(escalated from warnings in Plan 136). **Current baseline: 0 violations.**

Protected modules: `safety`, `privacy`, `ai`, `education`, `rag`,
`accessibility`, `tier`, `auth`, `security`, `compliance`.

Example:

```typescript
// OK - barrel import
import { detectJailbreak } from "@/lib/safety";

// ERROR - deep import from outside the module
import { patterns } from "@/lib/safety/jailbreak-detector/patterns";
```

Intra-module deep imports are allowed (code within `src/lib/safety/` can
import its own internals freely).

### Dependency Direction Rule

The `enforce-dependency-direction` rule enforces architectural layer boundaries
to prevent circular dependencies and maintain clean architecture:

**Direction between protected modules in `src/lib/`:**

The rule enforces dependency direction **within** `src/lib/` protected modules only.
It does NOT enforce boundaries between `src/lib/`, `src/app/`, and `src/components/`
(those are consumers and can freely import from `src/lib/`).

**Module tiers:**

- **CORE** (safety, security, privacy): Cannot import from FEATURE or CROSS modules
- **FEATURE** (ai, education, rag): May import from CORE only
- **CROSS** (auth, tier, accessibility, compliance): May import from CORE and FEATURE
- **Auth exception**: Any module may import from auth (universal dependency)

```typescript
// ❌ BLOCKED - FEATURE importing from CROSS
// src/lib/ai/summarize.ts
import { tierService } from "@/lib/tier/server"; // ERROR (ai is FEATURE, tier is CROSS)

// ✅ ALLOWED - CROSS importing from CORE
// src/lib/compliance/coppa-service.ts
import { filterInput } from "@/lib/safety"; // OK (compliance is CROSS, safety is CORE)

// ✅ ALLOWED - Any module importing from auth
// src/lib/ai/providers.ts
import { validateAuth } from "@/lib/auth/server"; // OK (auth is universal)
```

**Current status:** `warn` level (with `--max-warnings 0` in CI, effectively blocking).
Will escalate to `error` when all violations are resolved.

**Exception:** Test files (`*.test.ts`, `*.test.tsx`, `__tests__/`) are exempt
from both rules.

## Local Testing

```bash
# Run only tests for areas you changed
./scripts/test-affected.sh

# Dry run - see what would execute
./scripts/test-affected.sh --dry-run

# Run everything (same as CI push)
./scripts/test-affected.sh --all
```
