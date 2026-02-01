# Copilot Instructions — MirrorBuddy

## Language

- **Code, comments, documentation, commit messages**: ALWAYS English
- **UI text**: Localized via next-intl (5 locales: it/en/fr/de/es)

## Core Rules

1. **Minimum complexity**: Only what's requested. No over-engineering.
2. **Max 250 lines/file**: Split if exceeds. No exceptions.
3. **Tests first**: Write failing test, then implement, then pass (TDD).
4. **No workarounds**: No TODO, FIXME, @ts-ignore, `any` casts.
5. **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:` prefixes.

## TypeScript/React Style

- ESLint + Prettier, semicolons, single quotes, max 100 chars
- `const` over `let`, `async/await` over `.then()`
- Named imports, no default exports (unless Next.js page/layout)
- `interface` over `type` for object shapes
- Props interface declared above component
- Colocated `.test.ts` files, AAA pattern (Arrange/Act/Assert)

## Architecture Constraints

- **Database**: PostgreSQL + Prisma. Parameterized queries only.
- **State**: Zustand + REST. NO localStorage for user data (ADR 0015).
- **Auth**: Session-based `validateAuth()`. Admin via `ADMIN_EMAIL` (ADR 0075).
- **AI**: Azure OpenAI (primary), Ollama (fallback). Config: `src/lib/ai/providers.ts`.
- **Path aliases**: `@/lib/...`, `@/components/...`, `@/types`
- **i18n**: next-intl, 5 locales (it/en/fr/de/es). See `.claude/rules/i18n.md`.
- **Tiers**: Trial/Base/Pro. Logic in `src/lib/tier/` (ADR 0065).

## Quality Standards

- **Testing**: 80% business logic, 100% critical paths
- **Accessibility**: WCAG 2.1 AA, 4.5:1 contrast, keyboard nav, screen readers
- **Security**: Parameterized queries, CSP headers, env vars for secrets, RBAC
- **API**: REST, `/api/v1/`, paginate lists, rate limiting

## CSP — CRITICAL

`src/proxy.ts` (CSP header) + `src/components/providers.tsx` (nonces).
Before modifying CSP: `npm run test:unit -- csp-validation`.
"Caricamento..." forever = CSP blocking a resource.

## Guardrails

- Avatar images: WebP format
- EventSource: always call `.close()` on cleanup
- Heavy dependencies: lazy-load (dynamic import)
- Database: no N+1 queries, use `$transaction` for batch ops
- NO localStorage for user data (ADR 0015)

## Available Scripts

### Validation (use these, not raw npm commands)

```bash
./scripts/ci-summary.sh          # lint + typecheck + build (default)
./scripts/ci-summary.sh --quick  # lint + typecheck only (fast)
./scripts/ci-summary.sh --full   # + unit tests
./scripts/ci-summary.sh --lint   # lint only
./scripts/ci-summary.sh --types  # typecheck only
./scripts/ci-summary.sh --build  # build only
./scripts/ci-summary.sh --unit   # unit tests only
./scripts/health-check.sh        # full triage (~6 lines output)
```

### Release Gates

```bash
./scripts/release-fast.sh        # fast gate: lint+typecheck+unit+smoke
./scripts/release-gate.sh        # full 10/10 release gate
./scripts/release-brutal.sh      # paranoid mode
```

### Plan Execution (local CLI only)

```bash
export PATH="$HOME/.claude/scripts:$PATH"
plan-db.sh list-tasks {plan_id}         # see tasks to execute
plan-db.sh update-task {id} in_progress # mark started
plan-db.sh update-task {id} done "Summary" # mark complete
git-digest.sh                           # git status (compact JSON)
git-digest.sh --full                    # + file lists + recent commits
thor-validate.sh {plan_id}              # Thor validation (lint+types+build+F-xx)
diff-digest.sh main {branch}            # diff summary (compact)
```

### Testing

```bash
npm run test:unit                # Vitest unit tests
npm run test:e2e:smoke           # Playwright smoke tests
npm run test:e2e:i18n            # i18n tests
npm run test:e2e:security        # security tests
npm run test:e2e:compliance      # compliance tests
npm run test:e2e:api             # API tests
```

## Workflow for Plan Tasks

When executing a task from a plan:

1. **Read task**: `plan-db.sh get-task {task_id}` for full details
2. **Mark started**: `plan-db.sh update-task {id} in_progress "Started"`
3. **TDD RED**: Write failing test based on task criteria
4. **TDD GREEN**: Implement minimum code to pass
5. **Validate**: `./scripts/ci-summary.sh --quick`
6. **Mark done**: `plan-db.sh update-task {id} done "Summary"`
7. **Wave complete?**: `thor-validate.sh {plan_id}` for full validation

## File Organization

- Types: `src/types/index.ts`
- Safety filters: `src/lib/safety/`
- Maestro configs: `src/data/maestri/`
- Stores: `src/lib/stores/`
- PDF generation: `src/lib/pdf-generator/`
- RAG/embeddings: `src/lib/rag/`
- Tier logic: `src/lib/tier/`
- Proxy/CSP: `src/proxy.ts`
- Accessibility profiles: `src/lib/accessibility/`

## ADR References

Key decisions documented in `docs/adr/`:

- **ADR 0015**: No localStorage for user data
- **ADR 0028**: PostgreSQL + pgvector
- **ADR 0033**: RAG semantic search
- **ADR 0065**: Tier system (Trial/Base/Pro)
- **ADR 0075**: Session-based auth

Check `docs/adr/` before making architectural decisions.
