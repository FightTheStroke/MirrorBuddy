# CLAUDE.md

icon: public/logo-brain.png

AI-powered educational platform for students with learning differences.
22 AI "Maestri" with embedded knowledge, voice, FSRS flashcards, mind maps, quizzes, gamification.

---

## Commands

```bash
npm run dev          # Dev server :3000
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test         # Playwright E2E
npm run test:unit    # Vitest unit tests
npm run ci:summary   # PREFERRED: compact lint+typecheck+build (token-efficient)
npm run ci:summary:full # Same + unit tests
npm run release:fast # Fast gate: lint+typecheck+unit+smoke(+build)
npm run pre-push     # Vercel simulation - AUTO on git push
npm run release:gate # Full 10/10 release gate
npx prisma generate  # After schema changes
npx prisma migrate dev --name xyz  # Create migration (local only)
./scripts/sync-databases.sh  # Sync BOTH prod + test DBs after migrations
```

## Architecture

**Database**: PostgreSQL + pgvector (`prisma/schema/`) - ADR 0028
**AI Providers** (`src/lib/ai/providers.ts`): Azure OpenAI (primary) | Ollama (fallback)
**RAG System** (`src/lib/rag/`): Semantic search for conversations - ADR 0033
**State** (`src/lib/stores/`): Zustand + REST APIs - NO localStorage (ADR 0015)
**Trial Mode** (`src/lib/trial/`): Anonymous sessions, budget control - ADR 0056
**Invite System** (`src/lib/invite/`): Admin-approved beta access - ADR 0057
**Tier System** (`src/lib/tier/`): Trial/Base/Pro with TierService - ADR 0065
**Auth** (`src/lib/auth/`): Session-based with `validateAuth()`, admin via `ADMIN_EMAIL` (ADR 0075)
**Key paths**: Types `src/types/index.ts` | Safety `src/lib/safety/` | FSRS `src/lib/education/fsrs.ts` | Maestros `src/data/maestri/` | PDF `src/lib/pdf-generator/`

## Beta Environment Variables

```bash
ADMIN_EMAIL=admin@example.com
TRIAL_BUDGET_LIMIT_EUR=100
PROTECTED_USERS=email1@example.com,...
RESEND_API_KEY=re_xxx
TOKEN_ENCRYPTION_KEY=xxx              # 32+ chars for AES-256-GCM (ADR 0080)
SUPABASE_CA_CERT=xxx                  # SSL cert for production (ADR 0063)
```

## Vercel Deployment (ADR 0063, 0067)

- **NEVER** use `NODE_TLS_REJECT_UNAUTHORIZED=0`
- Required env vars: DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET, CRON_SECRET, SUPABASE_CA_CERT, AZURE_OPENAI_API_KEY
- Details: `@docs/claude/vercel-deployment.md`

## Modular Rules (auto-loaded)

`.claude/rules/`: accessibility | api-patterns | maestri | operations | compliance | e2e-testing | coaches-buddies | vercel-deployment | tier | cookies | i18n | proxy-architecture | mobile-readiness

## On-Demand Docs

Load with `@docs/claude/<name>.md`:

**Core**: mirrorbuddy | tools | database | api-routes | knowledge-hub | rag | safety | validation
**Voice**: voice-api | ambient-audio | onboarding
**Features**: learning-path | pomodoro | notifications | parent-dashboard | session-summaries | summary-tool | conversation-memory | pdf-generator | gamification
**Beta**: trial-mode | invite-system | observability-kpis
**Compliance**: e2e-setup | security-hardening | instant-a11y | admin-redesign | ai-compliance | supabase-ssl
**Characters**: buddies | coaches | adding-maestri
**Infra**: tier | mobile-readiness | vercel-deployment | cookies

## Setup Docs (one-time)

`docs/setup/`: database.md | docker.md

## LSP - USE IT

TypeScript LSP active. **Prefer LSP over grep/glob for navigation.**

| Task            | LSP Command           | Instead of         |
| --------------- | --------------------- | ------------------ |
| Find definition | go-to-definition      | Grep "function X"  |
| Find usages     | find-references       | Grep "useHook"     |
| Check signature | hover                 | Read entire file   |
| Find type       | go-to-type-definition | Grep "interface X" |

**Parallelize** independent tool calls in single message.

## i18n

**Locales**: `it` (default) | `en` | `fr` | `de` | `es`
**Framework**: next-intl (App Router, server-first)
**Structure**: `messages/{locale}/{namespace}.json` (ADR 0082)
**Namespaces**: common, auth, admin, chat, tools, settings, compliance, education, navigation, errors, welcome, metadata

**Quick Start**: Add to `messages/it/{ns}.json` -> `npm run i18n:sync` -> `useTranslations('ns')` -> `npm run i18n:check`

**Hooks**: `useTranslations('ns')` (client) | `getTranslations('ns')` (server) | `useLocaleContext()` (locale)

**Formal address** (ADR 0064): Historical figures use Lei/Sie/Vous. Set in `FORMAL_PROFESSORS`.

**Full docs**: `docs/i18n/` | `.claude/rules/i18n.md`

## Skills

| Skill              | When                      |
| ------------------ | ------------------------- |
| `/prompt`          | Extract F-xx requirements |
| `/planner`         | Create wave/task plan     |
| `/execute {id}`    | Run plan tasks            |
| `/release`         | Release validation        |
| `/frontend-design` | UI components             |
| `/localize`        | Translation workflow      |

## Release Process

`/release` runs: lint+typecheck+build, unit+E2E tests, security+quality audits, auto-fix, push+verify CI/Vercel.

## Subagents

| Agent                             | When                |
| --------------------------------- | ------------------- |
| `Explore`                         | Codebase questions  |
| `task-executor`                   | Plan task execution |
| `thor-quality-assurance-guardian` | Wave validation     |

## Workflow (non-trivial tasks)

1. `/prompt` -> F-xx requirements, user confirms
2. `/planner` -> Plan in DB, user approves
3. `/execute {id}` -> Tasks + Thor validation
4. Closure -> User approves ("finito")

**Skip ONLY for**: typos, single-file trivial fixes.

## Constraints

- WCAG 2.1 AA (7 DSA profiles in `src/lib/accessibility/`)
- NO localStorage for user data - Zustand + REST only
- Azure OpenAI primary, Ollama fallback
- Prisma for all DB operations
- Path aliases: `@/lib/...`, `@/components/...`

## CSP (Content Security Policy) - CRITICAL

**Files**: `src/proxy.ts` (CSP header), `src/components/providers.tsx` (nonces)
Before modifying: run `npm run test:unit -- csp-validation`. Scripts need `nonce` prop. Each domain needs explicit protocol.
**Common failure**: "Caricamento..." forever = CSP blocking. Check browser console. Docs: `src/lib/security/CSP-NONCE.md`

## Verification

**Token-efficient (PREFERRED for Claude sessions):**

```bash
npm run ci:summary        # lint+typecheck+build, ~20 lines output
npm run ci:summary:full   # same + unit tests
./scripts/ci-summary.sh --lint   # single step
./scripts/ci-summary.sh --types  # single step
./scripts/ci-summary.sh --i18n   # i18n only
```

**Full verbose (use only when summary is insufficient):**

```bash
npm run lint && npm run typecheck && npm run build && npm run test
```

**RULE: Always use `npm run ci:summary` first. Only fall back to verbose commands if the summary output is unclear.**

## Closure Protocol

**NEVER say "fatto/done" without**: verification output, all F-xx with [x]/[ ], deliverables with paths, user approval.

## Project Rules

- Tests first: failing test -> implement -> pass
- Update CHANGELOG for user-facing changes
- Types in `src/types/index.ts`
- Conventional commits
