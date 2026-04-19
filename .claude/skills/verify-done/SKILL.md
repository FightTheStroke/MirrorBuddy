---
name: verify-done
description: Gate before claiming any task complete. Runs health-check.sh + ci:summary, pastes output, only then allows "done" claim.
allowed-tools:
  - Bash
  - Read
context: inline
user-invocable: true
---

# Verify-Done — MirrorBuddy

Anti-premature-completion gate. Run BEFORE saying "done", "completed", "finished".

## Activation

- Message contains `/verify-done`
- Implicit: Claude MUST run this before claiming a task complete

## Mandatory Steps

### 1. Project health

```bash
./scripts/health-check.sh
```

Expect: no critical red. If red, NOT done.

### 2. CI summary

```bash
npm run ci:summary
```

Expect: lint + types + build all pass.

### 3. Task-specific verification

Match the change type:

| Change type          | Extra verification                                  |
| -------------------- | --------------------------------------------------- |
| UI text              | `npm run i18n:check` (all 5 locales synced)         |
| Prisma schema        | `npx prisma generate` + migration applied           |
| New env var          | `.env.example` + `validate-pre-deploy.ts` updated   |
| Client component     | Dev server running, manual click-through in browser |
| API route (mutation) | CSRF + auth middleware present                      |
| Cookie logic         | Uses `cookie-constants.ts`, no hardcoded names      |
| E2E test             | Imports from fixtures, not `@playwright/test`       |
| Admin route          | `withAdmin` + `withCSRF` + `auditService.log()`     |

### 4. Paste output

Copy the actual tool output into the reply. No summarization, no "looks good".

### 5. State explicitly

> "All verification checks passed. Task <name> complete."

Only after all four steps. If any step failed → task NOT done → keep working.

## Forbidden

- Claiming done without running health-check or ci:summary
- "I think it works" — either prove it or keep working
- Skipping i18n / env / CSRF checks when they apply
- Marking TaskUpdate completed before verification run

## Related

- `/pr` — open PR AFTER verify-done passes
- `/release` — full release gate
