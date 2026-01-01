# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Project Overview

**ConvergioEdu** ("La Scuola Che Vorrei") - AI-powered educational platform for students with learning differences (dyslexia, ADHD, autism, cerebral palsy). Features 17 AI "Maestros" (historical figures as tutors), voice conversations, FSRS flashcards, mind maps, quizzes, and gamification.

## Commands

```bash
npm run dev              # Dev server localhost:3000
npm run build            # Production build
npm run lint             # ESLint
npm run typecheck        # TypeScript (tsc --noEmit)
npm run test             # Playwright E2E tests
npx prisma generate      # Generate client after schema changes
npx prisma db push       # Sync schema with database
```

## Architecture

### AI Providers
`src/lib/ai/providers.ts` abstracts providers:
- **Azure OpenAI**: Primary, supports voice (Realtime API)
- **Ollama**: Fallback for local/offline text-only
- Voice requires Azure

### State Management (Zustand)
`src/lib/stores/app-store.ts`:
- **SettingsStore**: Theme, provider config, profile, accessibility
- **ProgressStore**: XP, levels, streaks, achievements
- **ChatStore**: Conversations, messages, tool calls

**Database First (ADR 0015)**: All stores sync via REST APIs - NO localStorage for user data.

### Data Persistence

| Data Type | Storage |
|-----------|---------|
| User settings | `/api/user/settings` |
| Progress | `/api/progress` |
| Materials | `/api/materials` |
| Conversations | `/api/conversations` |
| Session ID | `sessionStorage` |
| Device cache | `localStorage` (OK) |

### FSRS Flashcards
`src/lib/education/fsrs.ts` - Free Spaced Repetition Scheduler (FSRS-5).

### 17 Maestros
`src/data/maestri-full.ts` defines each historical figure with voice personality, teaching style, and subject specialization.

## On-Demand Documentation

Load detailed docs with `@docs/claude/filename.md`:

| Doc | Contents |
|-----|----------|
| `@docs/claude/mirrorbuddy.md` | Triangle of Support, Coach/Buddy system, character routing |
| `@docs/claude/voice-api.md` | Azure Realtime API, models, session config, debug checklist |
| `@docs/claude/tools.md` | Tool execution, mindmap/quiz/flashcard creation |
| `@docs/claude/notifications.md` | Server-side notifications, PWA push |
| `@docs/claude/parent-dashboard.md` | GDPR consent, parent-professor chat |
| `@docs/claude/pomodoro.md` | Timer phases, XP rewards |
| `@docs/claude/onboarding.md` | Voice onboarding with Melissa |

## Key Files

### Types
`src/types/index.ts` - All shared types. Import as `import type { Maestro } from '@/types'`.

### Components
- `components/ui/` - Headless primitives
- `components/accessibility/` - A11y controls
- `components/education/` - Quiz, flashcard, mindmap
- `components/voice/` - Voice session UI
- `components/maestros/` - Maestro selection
- `components/conversation/` - MirrorBuddy flow

### API Routes
All under `/src/app/api/`:
- `/chat` - Chat completions with safety filtering
- `/conversations/[id]` - Session management
- `/realtime/token` - Azure voice token
- `/progress` - XP, levels, gamification
- `/flashcards/progress` - FSRS updates
- `/notifications` - CRUD
- `/profile` - Student insights (GDPR)
- `/parent-professor` - Parent chat

## Database

Prisma at `prisma/schema.prisma`. Key models:
- **User** → Profile, Settings, Progress (1:1)
- **StudySession** - Learning with XP
- **FlashcardProgress** - FSRS state
- **Conversation** → Messages
- **Learning** - Cross-session insights
- **Notification** - Server persistence

```bash
npx prisma generate && npx prisma db push
```

## Accessibility

WCAG 2.1 AA mandatory. 7 profiles in Settings:
- Dislessia, ADHD, Autismo, Visivo, Uditivo, Motorio, Paralisi Cerebrale

Store: `src/lib/accessibility/accessibility-store.ts`

## Safety

`src/lib/safety/`:
- `guardrails.ts` - Injects safety into prompts
- `content-filter.ts` - Filters input/output
- `age-gating.ts` - Age-appropriate validation

## Environment

```bash
# Azure OpenAI (required for voice)
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
AZURE_OPENAI_REALTIME_ENDPOINT=
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime

# Ollama (local text-only)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Database
DATABASE_URL=file:./prisma/dev.db
```

## CI/CD

`.github/workflows/ci.yml`:
1. Build & Lint
2. Security Audit
3. Documentation Check
4. Code Quality

E2E tests require real AI providers - run locally before release.

## Path Aliases

```typescript
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/lib/stores/app-store';
```

## Summary Instructions

When compacting, focus on: code changes, test output, architectural decisions, and open tasks. Discard verbose file listings and intermediate debug output.
