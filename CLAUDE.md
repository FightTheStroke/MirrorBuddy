

# CLAUDE.md

AI-powered educational platform for students with learning differences.  
17 AI "Maestros", voice, FSRS flashcards, mind maps, quizzes, gamification.

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

## Quick Reference

- **Accessibility**: WCAG 2.1 AA, 7 profiles in `src/lib/accessibility/`
- **Database**: Prisma at `prisma/schema.prisma`
- **Path aliases**: `@/lib/...`, `@/components/...`

## New Feature Guidelines

When implementing new features:
1. **Tests first**: Write failing test → implement → pass
2. **Docs**: Update CHANGELOG, add to `@docs/claude/` if complex
3. **Types**: Add to `src/types/index.ts`
4. **Verify**: `npm run lint && npm run typecheck && npm run build`
5. **Commit**: Conventional format, reference issue if exists

## PLANNING RULES (MANDATORY)

⚠️ These rules apply **ONLY AFTER the execution plan has been approved**,  
in accordance with **SmartClaude.md**.

**UN PIANO NON ESEGUITO È PEGGIO DI NESSUN PIANO.**

1. **EXECUTE IMMEDIATELY (POST-APPROVAL)**
   - Dopo approvazione del piano: ESEGUI SUBITO
   - Zero attesa, zero conferme, zero "lo faccio dopo"
   - Se il piano è approvato e non lo esegui = HAI FALLITO

2. **TRACK PROGRESS IN REAL-TIME**
   - Aggiorna il piano mentre lavori: `[ ]` → `[🔄]` → `[✅]`
   - Se il file piano non è aggiornato, nessuno sa cosa è stato fatto

3. **VERIFY BEFORE "DONE"**
   - `npm run typecheck && npm run lint && npm run build` DEVE passare
   - Se fallisce, NON HAI FINITO - torna a fixare

4. **NO PARTIAL EXECUTION**
   - Un piano con 10 task = fai tutti e 10
   - "Wave 1 fatto, Wave 2-3 li faccio dopo" = INACCETTABILE
   - Finisci TUTTO quello che è nel piano

5. **PARALLEL EXECUTION**
   - Lancia agenti in parallelo per task indipendenti
   - Max 3 agenti per evitare crash
   - Checkpoint nel file piano per recovery

6. **SESSION RECOVERY**
   - Se la sessione si interrompe, il prossimo agente deve:
     - Leggere il piano
     - Vedere cosa è `[✅]` e cosa è `[ ]`
     - Continuare da dove si è fermato

**REGOLA D'ORO: Lavora prima, parla dopo.**

## Summary Instructions

When compacting: code changes, test output, architectural decisions, open tasks.  
Discard verbose listings and debug output.
