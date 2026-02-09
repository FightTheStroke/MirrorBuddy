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
6. **NEVER commit to main**: Always create branch `codex/{task_id}` first.
7. **ONE commit per task**: Never combine multiple tasks in one commit.
8. **Strict file scope**: Only touch files listed in the task. No "bonus" fixes.

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
./scripts/ci-summary.sh --unit       # unit tests only
./scripts/ci-summary.sh --migrations # schema drift check
./scripts/health-check.sh            # full triage (~6 lines output)
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

## Domain Rules

Detailed domain rules auto-load from `.github/instructions/` based on file path.
Key one-liners for quick reference:

- **Cookies**: Import from `src/lib/auth/cookie-constants.ts`, never hardcode
- **Auth**: `validateAuth()` / `validateAdminAuth()`, never `cookieStore.get()`
- **CSRF**: `withCSRF` BEFORE `withAdmin` in pipe() for mutations
- **i18n**: 5 locales, wrapper key convention `{ "ns": {...} }`, camelCase keys
- **E2E**: Fixtures only (never `@playwright/test`), mandatory `/api/tos` mock
- **Proxy**: ONE proxy at `src/proxy.ts` only (never root)
- **Admin**: `pipe(withSentry, withCSRF, withAdmin)` + `auditService.log()`
- **Tiers**: `tierService` / `useTierFeatures()`, never hardcode limits
- **Compliance**: EU AI Act + GDPR + COPPA, no PII in logs/vector DB

## Documentation Format

### ADR (max 20 lines, `docs/adr/{NNNN}-{slug}.md`)

```markdown
# ADR {NNNN}: {Title}

Status: Accepted | Date: {DD Mon YYYY} | Plan: {plan_id or "none"}

## Context

{2-3 sentences: what problem, when encountered}

## Decision

{2-3 sentences: what we chose, why}

## Consequences

- Positive: {outcome}
- Negative: {tradeoff}

## Enforcement

- Rule: `{eslint-rule-or-grep-pattern}`
- Check: `{verification command}`
```

### CHANGELOG (append to `## [Unreleased]`)

```markdown
### {Wave or Category}

- Added: {new feature/file}
- Changed: {modification}
- Fixed: {bug fix}
```

## Extended Customization

### Path-Specific Instructions (`.github/instructions/`)

Domain rules auto-loaded by file path:

| File                            | Applies To                        |
| ------------------------------- | --------------------------------- |
| `tier.instructions.md`          | `src/lib/tier/**`                 |
| `i18n.instructions.md`          | `messages/**`, i18n-related files |
| `cookies.instructions.md`       | `src/lib/auth/**`, API routes     |
| `e2e.instructions.md`           | `e2e/**`                          |
| `accessibility.instructions.md` | Components, a11y lib              |
| `proxy.instructions.md`         | `src/proxy.ts`, providers         |
| `compliance.instructions.md`    | Compliance docs, safety lib       |
| `admin.instructions.md`         | Admin API routes, admin pages     |
| `testing.instructions.md`       | All test files                    |

### Custom Agents (`.github/agents/`)

| Agent                | Use When                              |
| -------------------- | ------------------------------------- |
| `code-reviewer`      | Security + quality code review        |
| `tdd-executor`       | Feature development with TDD workflow |
| `a11y-auditor`       | Accessibility audit (7 DSA profiles)  |
| `compliance-checker` | Regulatory compliance verification    |

### Prompt Commands (`.github/prompts/`)

| Command         | Action                                |
| --------------- | ------------------------------------- |
| `/ci-check`     | Run CI summary (lint+typecheck+build) |
| `/health-check` | Full project health triage            |
| `/commit`       | Conventional commit helper            |
| `/tdd`          | Start TDD workflow for a feature      |
| `/review`       | Comprehensive code review             |
| `/localize`     | Sync i18n keys across 5 locales       |

### Skills (`.github/skills/`)

| Skill             | Auto-Activated When                      |
| ----------------- | ---------------------------------------- |
| `ci-verification` | Running checks, validating builds        |
| `release-gate`    | Preparing releases, deployment readiness |

## ADR References

Key decisions in `docs/adr/`:

- **0015**: No localStorage for user data
- **0028**: PostgreSQL + pgvector
- **0033**: RAG semantic search
- **0059**: E2E test fixture requirements
- **0060**: Accessibility (7 DSA profiles)
- **0065**: Tier system (Trial/Base/Pro)
- **0066**: Proxy architecture
- **0075**: Session-based auth
- **0082**: i18n namespace structure
- **0091**: camelCase i18n keys
- **0104**: Wrapper key convention (CRITICAL)

Check `docs/adr/` before making architectural decisions.
