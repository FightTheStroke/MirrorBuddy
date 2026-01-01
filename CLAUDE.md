# CLAUDE.md

AI-powered educational platform for students with learning differences. 17 AI "Maestros", voice, FSRS flashcards, mind maps, quizzes, gamification.

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

Load with `@docs/claude/<name>.md`: mirrorbuddy | voice-api | tools | notifications | parent-dashboard | pomodoro | onboarding | database | api-routes

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

## Summary Instructions

When compacting: code changes, test output, architectural decisions, open tasks. Discard verbose listings and debug output.
