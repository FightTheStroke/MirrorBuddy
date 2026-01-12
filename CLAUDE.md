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
npx prisma generate  # After schema changes
npx prisma db push   # Sync schema to PostgreSQL
```

## Database Setup (PostgreSQL + pgvector)

```bash
# macOS
brew install postgresql@17
brew services start postgresql@17
createdb mirrorbuddy
psql -d mirrorbuddy -c "CREATE EXTENSION vector;"

# .env
DATABASE_URL=postgresql://user@localhost:5432/mirrorbuddy
```

See ADR 0028 for full migration details.

## Architecture

**Database** (`prisma/schema.prisma`): PostgreSQL with pgvector for semantic search (ADR 0028).

**AI Providers** (`src/lib/ai/providers.ts`): Azure OpenAI (primary, voice, embeddings) | Ollama (fallback, text-only).

**RAG System** (`src/lib/rag/`): Semantic search for AI conversations (ADR 0033). Components: `embedding-service.ts` | `retrieval-service.ts` | `vector-store.ts` | `semantic-chunker.ts`.

**State** (`src/lib/stores/app-store.ts`): Zustand stores sync via REST APIs (ADR 0015) - NO localStorage for user data.

**Key paths**: Types `src/types/index.ts` | Safety `src/lib/safety/` | FSRS `src/lib/education/fsrs.ts` | Maestros `src/data/maestri/` | RAG `src/lib/rag/` | PDF Generator `src/lib/pdf-generator/`

**PDF Generator** (`src/lib/pdf-generator/`): Accessible PDF export for 7 DSA profiles (dyslexia, dyscalculia, dysgraphia, dysorthography, adhd, dyspraxia, stuttering). Uses @react-pdf/renderer. API: POST `/api/pdf-generator`.

## Tool Plugin System

**Location**: `src/lib/tools/plugin/` - Scalable tool registration and execution engine.

**Key Classes**:
- `ToolRegistry` - Singleton registry for plugin management (register, get, getByTrigger, getByCategory)
- `ToolOrchestrator` - Execution engine with validation, prerequisite checking, error handling
- `ToolPlugin` interface - Defines plugin structure: id, name, category, schema, handler, voice config, permissions

**Tool Categories**: CREATION, EDUCATIONAL, NAVIGATION, ASSESSMENT, UTILITY

**Permissions**: READ_CONVERSATION, READ_PROFILE, WRITE_CONTENT, VOICE_OUTPUT, FILE_ACCESS

**Quick Usage**:
```typescript
// Register plugin
const registry = ToolRegistry.getInstance();
registry.register(myTool);

// Execute tool
const orchestrator = new ToolOrchestrator(eventBroadcaster);
const result = await orchestrator.executeTool(toolId, args, context);

// Find by trigger
const tools = registry.getByTrigger('create mindmap');
```

See `@docs/claude/tool-plugins.md` for full documentation.

## Modular Rules (auto-loaded)

`.claude/rules/`: accessibility.md | api-patterns.md | maestri.md

## On-Demand Docs

Load with `@docs/claude/<name>.md`:

**Core**: mirrorbuddy | tools | database | api-routes | knowledge-hub | rag
**Voice**: voice-api | ambient-audio | onboarding
**Features**: learning-path | pomodoro | notifications | parent-dashboard | session-summaries | summary-tool | conversation-memory | pdf-generator
**Characters**: buddies | coaches

## LSP (active) - USE IT!

TypeScript LSP installed for 1300+ TS files. **Prefer LSP over grep/glob for code navigation.**

### When to Use LSP
| Task | LSP Command | Instead of |
|------|-------------|------------|
| Find component definition | go-to-definition | Grep "function ComponentName" |
| Find all usages of hook | find-references | Grep "useMyHook" |
| Check function signature | hover | Read entire file |
| Find type definition | go-to-type-definition | Grep "interface/type Name" |

### LSP Saves Tokens
```
# BAD: 3 tool calls, ~2000 tokens
Grep "HomeSidebar" → 17 files
Read file1.tsx → 200 lines
Read file2.tsx → 150 lines

# GOOD: 1 LSP call, ~200 tokens
go-to-definition on HomeSidebar import → exact location
```

### Parallel Tool Calls
Always parallelize independent operations:
- Reading multiple files → single message, multiple Read calls
- Checking lint + typecheck → single message, multiple Bash calls
- Searching different patterns → single message, multiple Grep calls

## Skills (slash commands)

| Skill | When to Use |
|-------|-------------|
| `/prompt` | Extract F-xx requirements from user request |
| `/planner` | Create wave/task plan after requirements approved |
| `/execute {plan_id}` | Run all pending tasks in plan |
| `/prepare` | Bootstrap new project |
| `/frontend-design` | Create distinctive UI components |

## Subagents

| Subagent | When to Use |
|----------|-------------|
| `Explore` | Open-ended codebase questions ("how does X work?", "where is Y handled?") |
| `task-executor` | Execute single plan task with DB update |
| `thor-quality-assurance-guardian` | Validate wave completion before closure |
| `strategic-planner` | Create complex multi-wave plans |

**Rule**: Use `Explore` for questions, direct tools for known locations.

## Workflow (MANDATORY for non-trivial tasks)

1. **`/prompt`** → Extract F-xx requirements, user confirms
2. **`/planner`** → Create plan with waves/tasks in DB, user approves
3. **`/execute {plan_id}`** → Run tasks, Thor validates per wave
4. **Closure** → User approves ("finito"), never self-declare

**Skip workflow ONLY for**: single-file fixes, typos, trivial changes.
**Uncertain if trivial?** → Use the workflow.

## Request Format (helps understanding)

Structure requests as:
- **What**: Specific action (add/fix/refactor/remove)
- **Where**: File path or component name
- **Why**: Context or problem being solved
- **Acceptance**: How to verify it works

**Good**: "Add maestro Economia in `maestri-society.ts`, avatar `economy.png`, color `#3B82F6`, specialized in microeconomics for DSA students. Verify: appears in list, voice works."

**Bad**: "Add an economics teacher"

## Project Rules

**Verification**: `npm run lint && npm run typecheck && npm run build && npm run test`

**Process**:
- Tests first: Write failing test → implement → pass
- Update CHANGELOG for user-facing changes
- Add to `@docs/claude/` if complex feature
- Types in `src/types/index.ts`
- Conventional commits, reference issue if exists

## Closure Protocol (Thor enforced)

**NEVER say "fatto/done" without**:
1. Verification command output shown (lint, typecheck, build)
2. All F-xx requirements listed with [x] or [ ] status
3. All deliverables listed with file paths
4. User approval - agent cannot self-declare complete

For plans: `thor-quality-assurance-guardian` validates before closure.
Skip Thor ONLY for trivial single-file changes.

**Constraints**:
- WCAG 2.1 AA accessibility (7 profiles in `src/lib/accessibility/`)
- NO localStorage for user data (ADR 0015) - Zustand + REST only
- Azure OpenAI primary, Ollama fallback only
- Prisma for all DB operations (`prisma/schema.prisma`)
- Path aliases: `@/lib/...`, `@/components/...`

## Optimization Health Check (run periodically)

When user asks "check optimization" or at start of long sessions:

```bash
# 1. Verify .claudeignore is effective
wc -l .claudeignore  # Should be ~60+ lines

# 2. Check rules are loaded
ls .claude/rules/    # Should show 4 files

# 3. Verify no large files crept in
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300' | head -10
```

**If issues found**:
- Large files (>300 lines): Suggest split per ADR 0016
- Missing rules: Recreate from ADR 0029
- .claudeignore outdated: Add new generated/test dirs

## Summary Instructions

**KEEP when compacting**:
- Code changes with exact file paths and line numbers
- F-xx requirements with status ([x] done, [ ] pending)
- Test results: which passed, which failed, why
- Architectural decisions made
- Open tasks and blockers
- User preferences expressed in conversation

**DISCARD**:
- Verbose file listings and directory trees
- Debug output and stack traces (keep only error message)
- Intermediate exploration steps
- Repeated explanations of same concept
- Full file contents (keep only changed sections)
