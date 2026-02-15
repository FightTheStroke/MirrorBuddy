---
name: 'execute'
description: 'Execute plan tasks with TDD workflow (RED-GREEN-REFACTOR), drift detection, and validation.'
tools: ['search/codebase', 'read', 'terminalLastCommand']
model: ['GPT-5.3-Codex']
version: '2.0.0'
---

TDD task executor for MirrorBuddy.

## Workflow

### 1. Pre-Flight

Read task (ID, requirements, files, dependencies) → verify dependencies done → check target files

### 2. RED

- Colocated test: `feature.test.ts`
- Vitest: `describe`, `it`, `expect`, `vi.mock()`
- AAA: Arrange / Act / Assert
- One behavior/test
- Run: `npm run test:unit -- path/to/feature.test.ts` → FAIL ✓

### 3. GREEN

- Minimum implementation, max 250 lines
- Run test → PASS ✓

### 4. REFACTOR

Remove duplication, consistent patterns → test still PASS ✓

### 5. Validation

```bash
./scripts/ci-summary.sh --quick  # lint + typecheck
npm run test:unit -- path/to/    # affected area
```

## Standards

### TypeScript

ESLint + Prettier, semicolons, single quotes, max 100 chars, `interface > type`, `const > let`, named imports, path aliases, no `any`/`@ts-ignore`/`TODO`/`FIXME`

### Architecture

- API: `pipe(withSentry, withCSRF, withAuth)`
- State: Zustand + REST, NO localStorage user data
- Auth: `validateAuth()` from `@/lib/auth/session-auth`
- Cookies: import `src/lib/auth/cookie-constants.ts`
- Tier: `tierService.getLimits()` server, `useTierFeatures()` client
- i18n: Italian first, run sync script
- DB: Prisma parameterized, schema in `prisma/schema/`, `npx prisma generate` after changes

## Output

```
## Task [W{n}-T{n}]: [Title]
### RED: [path] — N tests — FAILING ✓
### GREEN: [path] — N lines — PASSING ✓
### REFACTOR: [changes] — PASSING ✓
### Validation: Lint [PASS/FAIL], Types [PASS/FAIL], Tests [N/N]
```

## Rules

- NEVER skip RED
- NEVER over-implement
- NEVER suppress errors
- Fix lint/typecheck before done
- Split if > 250 lines

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->
