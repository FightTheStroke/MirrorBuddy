# CLAUDE.md

icon: public/logo-brain.png

AI-powered educational platform for students with learning differences.
20 AI "Maestros" with embedded knowledge, voice, FSRS flashcards, mind maps, quizzes, gamification.

---

## Commands

```bash
npm run dev          # Dev server :3000
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test         # Playwright E2E
npm run test:unit    # Vitest unit tests
npm run pre-push     # Vercel simulation (~45s) - AUTO on git push
npm run release:gate # Full 10/10 release gate
npx prisma generate  # After schema changes
npx prisma db push   # Sync schema to PostgreSQL
npx lhci autorun     # Lighthouse CI (performance budgets)
```

## Architecture

**Database**: PostgreSQL + pgvector (`prisma/schema/`) - ADR 0028

**AI Providers** (`src/lib/ai/providers.ts`): Azure OpenAI (primary) | Ollama (fallback)

**RAG System** (`src/lib/rag/`): Semantic search for conversations - ADR 0033

**State** (`src/lib/stores/`): Zustand + REST APIs - NO localStorage (ADR 0015)

**Trial Mode** (`src/lib/trial/`): Anonymous sessions (10 chats, 5 min voice, 10 tools), budget control - ADR 0056

**Invite System** (`src/lib/invite/`): Admin-approved beta access, email notifications - ADR 0057

**Auth** (`src/lib/auth/`): Session-based with `validateSessionAuth()`, admin via `ADMIN_EMAIL`

**Key paths**: Types `src/types/index.ts` | Safety `src/lib/safety/` | FSRS `src/lib/education/fsrs.ts` | Maestros `src/data/maestri/` | PDF `src/lib/pdf-generator/`

## Beta Environment Variables

```bash
ADMIN_EMAIL=admin@example.com     # Admin access control
TRIAL_BUDGET_LIMIT_EUR=100        # Monthly trial budget
RESEND_API_KEY=re_xxx             # Email notifications
```

## Modular Rules (auto-loaded)

`.claude/rules/`: accessibility.md | api-patterns.md | maestri.md | operations.md

## On-Demand Docs

Load with `@docs/claude/<name>.md`:

**Core**: mirrorbuddy | tools | database | api-routes | knowledge-hub | rag | safety | validation
**Voice**: voice-api | ambient-audio | onboarding
**Features**: learning-path | pomodoro | notifications | parent-dashboard | session-summaries | summary-tool | conversation-memory | pdf-generator | gamification
**Beta**: trial-mode (ADR 0056) | invite-system (ADR 0057) | observability-kpis (ADR 0058)
**Characters**: buddies | coaches | adding-maestri

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

## Skills

| Skill              | When                      |
| ------------------ | ------------------------- |
| `/prompt`          | Extract F-xx requirements |
| `/planner`         | Create wave/task plan     |
| `/execute {id}`    | Run plan tasks            |
| `/frontend-design` | UI components             |

## Subagents

| Agent                             | When                |
| --------------------------------- | ------------------- |
| `Explore`                         | Codebase questions  |
| `task-executor`                   | Plan task execution |
| `thor-quality-assurance-guardian` | Wave validation     |

## Workflow (non-trivial tasks)

1. `/prompt` → F-xx requirements, user confirms
2. `/planner` → Plan in DB, user approves
3. `/execute {id}` → Tasks + Thor validation
4. Closure → User approves ("finito")

**Skip ONLY for**: typos, single-file trivial fixes.

## Constraints

- WCAG 2.1 AA (7 DSA profiles in `src/lib/accessibility/`)
- NO localStorage for user data - Zustand + REST only
- Azure OpenAI primary, Ollama fallback
- Prisma for all DB operations
- Path aliases: `@/lib/...`, `@/components/...`

## Verification

```bash
npm run lint && npm run typecheck && npm run build && npm run test
```

## Closure Protocol

**NEVER say "fatto/done" without**:

1. Verification output shown
2. All F-xx listed with [x] or [ ]
3. Deliverables with file paths
4. User approval

For plans: `thor-quality-assurance-guardian` validates before closure.

## Project Rules

- Tests first: failing test → implement → pass
- Update CHANGELOG for user-facing changes
- Types in `src/types/index.ts`
- Conventional commits
