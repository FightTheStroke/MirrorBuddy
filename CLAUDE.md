# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ConvergioEdu** ("La Scuola Che Vorrei") is an AI-powered educational platform for students with learning differences (dyslexia, ADHD, autism, cerebral palsy). Features 17 AI "Maestros" (historical figures as tutors), voice conversations, FSRS flashcards, mind maps, quizzes, and gamification.

## Commands

```bash
# Development
npm run dev              # Start dev server at localhost:3000
npm run build            # Production build
npm run lint             # ESLint
npm run typecheck        # TypeScript check (tsc --noEmit)

# Testing (Playwright E2E)
npm run test             # Run all E2E tests
npm run test:ui          # Playwright UI mode
npm run test:headed      # Run with visible browser
npm run test:debug       # Debug mode
npx playwright test e2e/accessibility.spec.ts  # Run single test file

# Database (Prisma with libSQL adapter)
npx prisma generate      # Generate Prisma client (required after schema changes)
npx prisma db push       # Sync schema with database
npx prisma studio        # Database GUI
npx prisma migrate dev   # Create migration
```

## Architecture

### Dual AI Provider Pattern
The app abstracts AI providers in `src/lib/ai/providers.ts`:
- **Azure OpenAI**: Primary provider, supports voice (Realtime API)
- **Ollama**: Fallback for local/offline text-only mode
- Provider selection: user preference → Azure if configured → Ollama fallback
- Voice features require Azure (Ollama doesn't support realtime audio)

### State Management (Zustand)
Three stores in `src/lib/stores/app-store.ts`:
- **SettingsStore**: Theme, provider config, student profile, accessibility
- **ProgressStore**: XP, levels, streaks, achievements, subject masteries
- **ChatStore**: Active conversation, messages, tool calls
- Stores persist to localStorage and sync with server via API

### FSRS Flashcard Algorithm
`src/lib/education/fsrs.ts` implements Free Spaced Repetition Scheduler (FSRS-5):
- Card states: `new` → `learning` → `review` → `relearning`
- Tracks difficulty, stability, retrievability per card
- Calculates optimal review intervals for retention

### 17 Maestros (AI Tutors)
`src/data/maestri-full.ts` (4700+ lines) defines each historical figure with:
- Voice personality (`voiceInstructions`) for Azure Realtime
- Teaching style and subject specialization
- System prompt with pedagogical guidelines
- Greeting message and avatar

### Key Type Definitions
`src/types/index.ts` contains all shared types. Import as:
```typescript
import type { Maestro, UserProfile, StudySession } from '@/types';
```

### Component Organization
Components organized by feature domain:
- `components/ui/` - Headless primitives (button, card, dialog)
- `components/accessibility/` - A11y settings and controls
- `components/education/` - Quiz, flashcard, mind map, homework
- `components/voice/` - Voice session UI
- `components/maestros/` - Maestro selection grid

### API Routes (Next.js App Router)
All under `/src/app/api/`:
- `/chat` - Chat completions (Azure/Ollama)
- `/conversations/[id]` - Session management
- `/realtime/token` - Azure voice token (CORS-safe)
- `/progress` - XP, levels, gamification
- `/flashcards/progress` - FSRS state updates
- `/user/data` - GDPR export/delete

## Database Schema

Prisma schema at `prisma/schema.prisma`. Key models:
- **User** → has Profile, Settings, Progress (1:1)
- **StudySession** - Learning activity with XP tracking
- **FlashcardProgress** - FSRS-5 algorithm state per card
- **Conversation** → has Messages - Chat history with summaries
- **Learning** - Cross-session insights extracted from conversations

After schema changes:
```bash
npx prisma generate && npx prisma db push
```

## Accessibility Requirements

WCAG 2.1 AA compliance is mandatory:
- Full keyboard navigation
- Minimum 4.5:1 color contrast
- Screen reader compatible
- Dyslexia font option (OpenDyslexic)
- ADHD mode (focus helpers)
- Motion reduction support

Accessibility store at `src/lib/accessibility/accessibility-store.ts`.

## Environment Configuration

Copy `.env.example` to `.env.local`. Key variables:
```bash
# Azure OpenAI (required for voice)
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
AZURE_OPENAI_REALTIME_ENDPOINT=    # Voice features
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime-preview

# OR Ollama (local, text-only)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Database
DATABASE_URL=file:./prisma/dev.db  # SQLite local, PostgreSQL in prod
```

## CI/CD Pipeline

`.github/workflows/ci.yml` runs fast checks on every PR:
1. **Build & Lint**: ESLint + TypeScript + Next.js build
2. **Security Audit**: npm audit + secret detection
3. **Documentation Check**: Required files exist
4. **Code Quality**: TODO/FIXME and console.log detection

E2E tests are NOT run in CI - they require real AI providers.

## Testing Strategy

**CI (GitHub Actions)**: Fast validation (~2 min)
- Build, lint, typecheck, security scan
- No E2E tests (require AI providers)

**Release (app-release-manager)**: Full E2E with REAL APIs
- Requires Azure OpenAI or Ollama running locally
- Tests all 17 maestri with actual AI responses
- Voice session tests with Azure Realtime API
- FSRS flashcard algorithm verification
- Accessibility audit with Lighthouse

```bash
# Before release, run locally with real AI:
ollama serve                     # Start Ollama locally
npm run test                     # Full E2E suite
npx playwright test --headed     # Visual debugging
```

## Path Aliases

Use `@/` for imports:
```typescript
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/lib/stores/app-store';
import { Maestro } from '@/types';
```
