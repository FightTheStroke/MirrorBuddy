# Copilot Instructions — MirrorBuddy

## Language

- **Code, comments, documentation, commit messages**: ALWAYS English
- **UI text**: localized via next-intl (it/en/fr/de/es)

## Core Rules

1. Minimum complexity: solve only the requested scope.
2. Max 250 lines per file: split when needed.
3. TDD required for logic changes: RED -> GREEN -> REFACTOR.
4. No shortcuts: no TODO, FIXME, @ts-ignore, or `any` casts.
5. Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`.
6. Never commit directly to `main`.
7. Verify before claim: do not report "done" without evidence.

## Architecture Constraints

- **Framework**: Next.js 16 (App Router).
- **Database**: PostgreSQL + Prisma (+ pgvector where required).
- **Auth**: session-based `validateAuth()` / `validateAdminAuth()` (ADR 0075).
- **State**: Zustand + REST, never localStorage for user data (ADR 0015).
- **AI providers**: Azure OpenAI primary, Ollama fallback.
- **Tiers**: Trial/Base/Pro via `src/lib/tier/`.
- **i18n**: next-intl, 5 locales (`it`, `en`, `fr`, `de`, `es`).
- **Path aliases**: `@/lib/...`, `@/components/...`, `@/types/...`.

## Critical Paths

- **Proxy**: only `src/proxy.ts` (never root middleware/proxy files).
- **CSP**: keep `src/proxy.ts` headers aligned with `src/components/providers.tsx` nonces.
- **Safety**: enforce safeguards under `src/lib/safety/`.
- **Accessibility**: preserve WCAG 2.1 AA requirements and 7 DSA profiles.

## Security and Compliance

- Use Prisma/parameterized data access only.
- Never log sensitive personal data.
- Respect EU AI Act + GDPR + COPPA constraints in feature behavior and data flows.
- Keep admin endpoints protected by proper auth + CSRF guard order.

## Validation Commands

Use project scripts first (compact output, stable workflow):

```bash
./scripts/ci-summary.sh
./scripts/ci-summary.sh --quick
./scripts/ci-summary.sh --full
./scripts/ci-summary.sh --unit
./scripts/ci-summary.sh --migrations
./scripts/health-check.sh
```

Release/ops checks when relevant:

```bash
./scripts/release-fast.sh
./scripts/release-gate.sh
./scripts/verify-sentry-config.sh
./scripts/verify-vercel-env.sh
```

## Engineering Standards

- ESLint + Prettier style compliance.
- `const` over `let` where possible.
- `async/await` over promise chains.
- Named exports preferred unless framework conventions require default export.
- Keep tests colocated and focused on one behavior each.
- Avoid N+1 query patterns; use batching/transactions where needed.
- Close `EventSource` streams in cleanup paths.

## Workflow

1. Confirm scope and constraints from task + impacted files.
2. Add or adjust failing tests first for behavior changes.
3. Implement the minimum change needed.
4. Run the smallest relevant validation command, then broader checks if risk requires.
5. Report changed files, verification commands, and residual risks.

## Definition of Done

A task is complete only when:

- Requested behavior is implemented.
- Relevant tests/checks pass.
- No forbidden shortcuts were introduced.
- Output includes concrete verification evidence.

## Domain-Specific Rules

Also follow path-specific guidance in `.github/instructions/`:

- `cookies.instructions.md`
- `tier.instructions.md`
- `testing.instructions.md`
- `compliance.instructions.md`
- `accessibility.instructions.md`
- `admin.instructions.md`
- `proxy.instructions.md`
- `i18n.instructions.md`
- `e2e.instructions.md`
