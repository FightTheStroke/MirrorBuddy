# MirrorBuddy — Cross-Agent Instructions

AI-powered educational platform for students with learning differences.
26 AI "Maestri" with voice, FSRS flashcards, mind maps, quizzes, gamification.

## Language

- **Code, comments, documentation**: ALWAYS English
- **UI text**: Localized via next-intl (it/en/fr/de/es)

## Core Rules

1. Minimum complexity — only what's requested, no over-engineering
2. Max 250 lines per file — split if exceeds
3. Tests first — TDD (RED, GREEN, REFACTOR)
4. No workarounds — no TODO, FIXME, @ts-ignore, `any` casts
5. Conventional commits — `feat:`, `fix:`, `chore:`, `docs:`

## Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL + Prisma + pgvector
- **AI**: Azure OpenAI (primary), Claude (fallback), Ollama (local)
- **State**: Zustand + REST (NO localStorage for user data)
- **Auth**: Session-based `validateAuth()` (ADR 0075)
- **i18n**: next-intl, 5 locales (it/en/fr/de/es)
- **Tiers**: Trial/Base/Pro (`src/lib/tier/`)

## Critical Paths

- **Proxy**: Only at `src/proxy.ts` (never root)
- **CSP**: `src/proxy.ts` headers + `src/components/providers.tsx` nonces
- **Safety**: `src/lib/safety/` (bias detection, content filtering)
- **Accessibility**: 7 DSA profiles, WCAG 2.1 AA

## Validation

```bash
./scripts/ci-summary.sh          # lint + typecheck + build
./scripts/ci-summary.sh --quick  # lint + typecheck only
./scripts/health-check.sh        # full project triage
```

## Quality

- WCAG 2.1 AA (4.5:1 contrast, keyboard nav, screen readers)
- EU AI Act + GDPR + COPPA compliance
- 80% test coverage business logic, 100% critical paths
- Parameterized queries only (Prisma)

## Detailed Instructions

See `.github/copilot-instructions.md` for full project rules.
See `.github/instructions/` for domain-specific rules.
See `.github/agents/` for specialized agent personas.
