# CLAUDE.md

icon: public/logo-brain.png

AI-powered educational platform for students with learning differences.
17 AI "Maestros", voice, FSRS flashcards, mind maps, quizzes, gamification.

---

## MANDATORY: Task Tracking + Thor Verification

### Task Updates
**BEFORE starting ANY task:**
```bash
~/.claude/scripts/plan-db.sh update-task {DB_ID} in_progress
```

**AFTER completing ANY task:**
```bash
~/.claude/scripts/plan-db.sh update-task {DB_ID} done
```

### THOR CHECKPOINT (after EACH wave)
**BEFORE marking a wave complete, you MUST:**
```bash
# 1. Validate database integrity
~/.claude/scripts/plan-db.sh validate 5

# 2. Run build verification
npm run lint && npm run typecheck && npm run build

# 3. Check functional requirements in plan
cat ~/.claude/plans/convergioedu/MirrorBuddyGamification-Main.md | grep "F-"
```

**Wave is NOT done until:**
- [ ] All tasks in wave marked done
- [ ] `plan-db.sh validate` passes
- [ ] Build passes (lint + typecheck + build)
- [ ] Related F-xx requirements verified with evidence

### When Asked "è finito?"
1. Run Thor validation
2. Show F-xx status
3. Show build output
4. Only confirm if ALL pass

**Current Wave: W3 - Maestri Redesign (8 tasks pending)**

| DB ID | Task | Description |
|-------|------|-------------|
| 33 | T3-01 | Ridisegnare avatar Maestri |
| 34 | T3-02 | Aggiungere frasi iconiche |
| 35 | T3-03 | Creare MasterCardFull |
| 36 | T3-04 | Implementare suggerimenti maestro |
| 37 | T3-05 | Contesto 5 min prima chiusura |
| 38 | T3-06 | Aggiornare chat bubbles |
| 39 | T3-07 | Animazioni entrata maestro |
| 40 | T3-08 | Test interazione maestri |

**Next Wave: W5 - Fix e Polish (6 tasks)**

| DB ID | Task | Description |
|-------|------|-------------|
| 49 | T5-01 | Responsive mobile Zaino |
| 50 | T5-02 | Responsive mobile Astuccio |
| 51 | T5-03 | Responsive gamification |
| 52 | T5-04 | Parent dashboard mobile |
| 53 | T5-05 | Performance optimization |
| 48 | T5-06 | Final E2E test suite |

Full task reference: `~/.claude/plans/convergioedu/README.md`

---

## Commands

```bash
npm run dev          # Dev server :3000
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test         # Playwright E2E
npx prisma generate  # After schema changes
npx prisma db push   # Sync schema
```

## Architecture

**AI Providers** (`src/lib/ai/providers.ts`): Azure OpenAI (primary, voice) | Ollama (fallback, text-only)

**State** (`src/lib/stores/app-store.ts`): Zustand stores sync via REST APIs (ADR 0015) - NO localStorage for user data.

**Key paths**: Types `src/types/index.ts` | Safety `src/lib/safety/` | FSRS `src/lib/education/fsrs.ts` | Maestros `src/data/maestri-full.ts`

## On-Demand Docs

Load with `@docs/claude/<name>.md`:

**Core**: mirrorbuddy | tools | database | api-routes | knowledge-hub  
**Voice**: voice-api | ambient-audio | onboarding  
**Features**: pomodoro | notifications | parent-dashboard | session-summaries | summary-tool | conversation-memory  
**Characters**: buddies | coaches

## Project Rules

**Verification**: `npm run lint && npm run typecheck && npm run build && npm run test`

**Process**:
- Tests first: Write failing test → implement → pass
- Update CHANGELOG for user-facing changes
- Add to `@docs/claude/` if complex feature
- Types in `src/types/index.ts`
- Conventional commits, reference issue if exists

**Constraints**:
- WCAG 2.1 AA accessibility (7 profiles in `src/lib/accessibility/`)
- NO localStorage for user data (ADR 0015) - Zustand + REST only
- Azure OpenAI primary, Ollama fallback only
- Prisma for all DB operations (`prisma/schema.prisma`)
- Path aliases: `@/lib/...`, `@/components/...`

## Summary Instructions

When compacting: code changes, test output, architectural decisions, open tasks.  
Discard verbose listings and debug output.
