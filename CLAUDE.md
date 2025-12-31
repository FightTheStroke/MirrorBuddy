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

### MirrorBuddy v2.0 - Triangle of Support

> **Architecture from ManifestoEdu.md** - Three layers of support for students with learning differences.

```
┌─────────────────────────────────────────────────────────────┐
│                    TRIANGLE OF SUPPORT                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      MAESTRI (17)                           │
│                    Subject Experts                          │
│              "Vertical" - Content Teaching                  │
│                                                             │
│         ┌───────────────┬───────────────┐                   │
│         │               │               │                   │
│         ▼               ▼               ▼                   │
│      COACH            COACH          BUDDY                  │
│    (Melissa)         (Davide)    (Mario/Maria)              │
│   Learning Method   Learning Method  Peer Support           │
│   "Vertical"        "Vertical"      "Horizontal"            │
│   Autonomy-focused  Calm/Reassuring  Emotional Connection   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Key Files

| File | Purpose |
|------|---------|
| `src/data/support-teachers.ts` | Melissa & Davide coach profiles |
| `src/data/buddy-profiles.ts` | Mario & Maria buddy profiles |
| `src/lib/ai/character-router.ts` | Routes students to appropriate character |
| `src/lib/ai/handoff-manager.ts` | Manages transitions between characters |
| `src/lib/ai/intent-detection.ts` | Detects student intent (academic, method, emotional) |
| `src/components/conversation/conversation-flow.tsx` | Main conversation UI |
| `src/components/conversation/character-chat-view.tsx` | Coach/Buddy chat with voice (side-by-side layout) |
| `src/lib/stores/conversation-flow-store.ts` | Conversation state management |
| `src/lib/profile/profile-generator.ts` | Generates student profiles from Maestri insights |
| `src/components/profile/parent-dashboard.tsx` | Parent dashboard UI showing student insights |
| `src/app/parent-dashboard/page.tsx` | Parent dashboard route (`/parent-dashboard`) |
| `src/lib/safety/` | Safety guardrails for all characters |

#### Character Types

```typescript
type CharacterType = 'maestro' | 'coach' | 'buddy';
```

- **Maestro**: Subject expert (Archimede, Leonardo, Dante, etc.)
- **Coach**: Learning method coach (Melissa or Davide)
- **Buddy**: Peer support companion (Mario or Maria)

#### Buddy Mirroring System

Buddies dynamically mirror the student's profile:
- **Age**: Always 1 year older than student (`ageOffset: 1`)
- **Learning Differences**: Same as student (dyslexia, ADHD, autism, etc.)
- **Gender**: Student can choose Mario (male) or Maria (female)

```typescript
// Example: Buddy system prompt is generated dynamically
const prompt = getMarioSystemPrompt(studentProfile);
// Mario says: "Ho la dislessia (le lettere a volte si confondono...)"
// This mirrors the STUDENT'S learning differences
```

#### Character Routing

Intent → Character routing logic in `character-router.ts`:

| Student Intent | Routed To | Reason |
|----------------|-----------|--------|
| "Spiegami le frazioni" | Maestro (Archimede) | Academic content |
| "Non riesco a concentrarmi" | Coach (Melissa) | Study method |
| "Mi sento solo" | Buddy (Mario) | Emotional support |
| "Ho paura di sbagliare" | Buddy (Mario) | Emotional support |

#### Handoff Protocol

Characters can suggest handoffs to each other:
- Maestro → Coach: "Per organizzarti meglio, prova Melissa"
- Coach → Buddy: "Vuoi parlare con Mario? Lui capisce"
- Buddy → Maestro: "Per matematica, chiedi ad Archimede!"

Handoffs are tracked in `handoff-manager.ts` to maintain conversation context.

#### Voice Support for Coach & Buddy

`CharacterChatView` provides voice calling for Coach (Melissa) and Buddy (Mario) characters:

```
┌─────────────────────────────────┬────────────┐
│         Chat Area               │   Voice    │
│   (unified message stream)      │   Panel    │
│                                 │            │
│   🔊 Voice transcript here      │  [Avatar]  │
│   💬 Text message here          │  [Status]  │
│   🔊 Voice transcript here      │  [Mute]    │
│                                 │  [Hangup]  │
└─────────────────────────────────┴────────────┘
```

- **Side-by-side layout**: Voice panel on right, chat on left
- **Unified conversation**: Voice transcripts appear in chat with 🔊 icon
- **Theme integration**: Panel uses character's gradient color
- **Azure Realtime API**: Same voice infrastructure as Maestri

Voice profiles defined in:
- `support-teachers.ts`: Coaches have `voice` and `voiceInstructions` fields
- `buddy-profiles.ts`: Buddies have `voice` and `voiceInstructions` fields

### Safety Guardrails

All AI characters (Maestri, Coaches, Buddies) have safety guardrails injected into their system prompts.

| File | Purpose |
|------|---------|
| `src/lib/safety/index.ts` | Main safety module exports |
| `src/lib/safety/guardrails.ts` | `injectSafetyGuardrails()` function |
| `src/lib/safety/content-filter.ts` | `filterInput()` and `sanitizeOutput()` |
| `src/lib/safety/age-gating.ts` | Age-appropriate content validation |
| `src/lib/safety/monitoring.ts` | Safety event logging |

**Integration Points:**
- `character-router.ts:390` - Injects guardrails into Maestro prompts
- `/api/chat/route.ts` - Filters input before AI, sanitizes output after

### Parent Dashboard (GDPR Compliant)

Dashboard at `/parent-dashboard` shows aggregated insights from student's conversations with Maestri.

**Consent Model:**
- Requires explicit consent from BOTH parent and student
- Data can be exported (JSON/PDF) for portability
- Right to erasure: deletion requests are tracked and honored
- All access is logged in `ProfileAccessLog` for audit

**Data Flow:**
```
Conversations → Learning table → profile-generator.ts → StudentInsightProfile
                                                               ↓
                                                    Parent Dashboard UI
```

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
- `components/conversation/` - MirrorBuddy conversation flow (Triangle of Support)

### API Routes (Next.js App Router)
All under `/src/app/api/`:
- `/chat` - Chat completions (Azure/Ollama) with safety filtering
- `/conversations/[id]` - Session management
- `/realtime/token` - Azure voice token (CORS-safe)
- `/progress` - XP, levels, gamification (triggers notifications)
- `/flashcards/progress` - FSRS state updates
- `/user/data` - GDPR export/delete
- `/notifications` - Notification CRUD (GET, POST, PATCH, DELETE)
- `/profile` - Student insight profiles (GDPR compliant)
- `/profile/generate` - Trigger profile generation from learnings
- `/profile/consent` - Manage GDPR consent for profiles
- `/profile/export` - Export profile (JSON or PDF)

## Database Schema

Prisma schema at `prisma/schema.prisma`. Key models:
- **User** → has Profile, Settings, Progress (1:1)
- **StudySession** - Learning activity with XP tracking
- **FlashcardProgress** - FSRS-5 algorithm state per card
- **Conversation** → has Messages - Chat history with summaries
- **Learning** - Cross-session insights extracted from conversations
- **StudentInsightProfile** - GDPR-compliant parent dashboard data with consent tracking
- **ProfileAccessLog** - Audit log for GDPR compliance
- **Notification** - Server-side notification persistence with scheduling
- **TelemetryEvent** - Usage analytics for Grafana integration

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

### Accessibility Profiles (7 presets)
Quick-select profiles in Settings → Accessibilità:
| Profile | Key Features |
|---------|--------------|
| Dislessia | OpenDyslexic font, increased spacing, TTS |
| ADHD | Focus mode, reduced animations, break timers |
| Autismo | Reduced motion, distraction-free, calm UI |
| Visivo | High contrast, large text, TTS enabled |
| Uditivo | Visual-first communication, no audio dependencies |
| Motorio | Keyboard navigation, no animations |
| Paralisi Cerebrale | TTS, large text, keyboard nav, extra spacing |

Accessibility store at `src/lib/accessibility/accessibility-store.ts`.

## Notification System

**STATUS: IMPLEMENTED**

Server-side notification system with database persistence and automatic triggers.

### Architecture

| Layer | File | Purpose |
|-------|------|---------|
| Database | `prisma/schema.prisma` → Notification | Persistent storage with scheduling |
| Server Triggers | `src/lib/notifications/server-triggers.ts` | Create notifications on events |
| API | `src/app/api/notifications/route.ts` | CRUD operations |
| Client Store | `src/lib/stores/notification-store.ts` | Zustand state + API sync |
| UI | `src/components/notifications/` | Toast display |

### Automatic Triggers

Notifications are automatically created when:
- **Level Up**: User reaches new XP level → `serverNotifications.levelUp()`
- **Streak Milestone**: 3, 7, 14, 30, 50, 100, 365 days → `serverNotifications.streakMilestone()`
- **Achievement Unlocked**: New achievement earned → `serverNotifications.achievement()`
- **Session Complete**: Study session ends → `serverNotifications.sessionComplete()`
- **Streak At Risk**: No study today with active streak → `serverNotifications.streakAtRisk()`

### Adding New Triggers

1. Add method to `server-triggers.ts`:
```typescript
serverNotifications.myNewTrigger = async (userId: string, data: MyData) => {
  await createNotification({
    userId,
    type: 'my_type',
    title: 'Notification Title',
    message: 'Notification message...',
  });
};
```

2. Call from relevant API route or server action

## Tool Execution System

**STATUS: IMPLEMENTED**

Maestri can create interactive educational tools during conversations using OpenAI function calling.

### Available Tools

| Tool | Function Name | Purpose |
|------|---------------|---------|
| Mind Map | `create_mindmap` | Visual concept organization (MarkMap rendering) |
| Quiz | `create_quiz` | Multiple choice assessment |
| Flashcards | `create_flashcards` | FSRS-compatible spaced repetition cards |
| Demo | `create_demo` | Interactive HTML/JS simulations (sandboxed) |
| Search | `web_search` | Educational web/YouTube search |

### Architecture

| Layer | File | Purpose |
|-------|------|---------|
| Types | `src/types/tools.ts` | Unified tool types + `CHAT_TOOL_DEFINITIONS` |
| Executor | `src/lib/tools/tool-executor.ts` | Handler registry and execution |
| Handlers | `src/lib/tools/handlers/*.ts` | Tool-specific logic |
| Events | `src/lib/realtime/tool-events.ts` | SSE broadcasting |
| Storage | `src/lib/storage/materials-db.ts` | IndexedDB for client-side materials |
| Persistence | `prisma/schema.prisma` → `CreatedTool` | Server-side tool records |

### Adding a New Tool

1. Add type to `src/types/tools.ts`:
```typescript
export interface MyToolData {
  // Tool-specific fields
}
```

2. Add function definition to `CHAT_TOOL_DEFINITIONS` in same file

3. Create handler in `src/lib/tools/handlers/`:
```typescript
import { registerToolHandler } from '../tool-executor';

registerToolHandler('my_tool', async (args) => {
  // Validate and process
  return { success: true, toolId, toolType: 'my_tool', data };
});
```

4. Import handler in `src/lib/tools/handlers/index.ts`

### Security

- **Demo Sandbox**: JavaScript validated against `DANGEROUS_JS_PATTERNS` blocklist
- **HTML Sanitization**: Script tags and event handlers removed
- **Iframe Isolation**: `sandbox="allow-scripts"` (no same-origin access)

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

## Voice API (Azure Realtime) - CRITICAL

> **LEGGI QUESTO PRIMA DI TOCCARE IL CODICE VOICE**

### Preview vs GA API - IL BUG CHE FA PERDERE ORE

Azure ha DUE versioni dell'API Realtime con **event names DIVERSI**:

| Evento | Preview API (`gpt-4o-realtime-preview`) | GA API (`gpt-realtime`) |
|--------|----------------------------------------|-------------------------|
| Audio chunk | `response.audio.delta` | `response.output_audio.delta` |
| Transcript | `response.audio_transcript.delta` | `response.output_audio_transcript.delta` |

**Se il codice aspetta l'evento sbagliato, l'audio arriva ma NON viene riprodotto!**

### File Critici Voice

| File | Responsabilità |
|------|----------------|
| `src/lib/hooks/use-voice-session.ts` | Hook principale - gestisce ENTRAMBI i formati (linee 575-616) |
| `src/server/realtime-proxy.ts` | WebSocket proxy - detection Preview/GA (linee 43-74) |
| `src/app/test-voice/page.tsx` | Pagina debug - test manuale WebSocket |
| `docs/AZURE_REALTIME_API.md` | **DOCUMENTAZIONE COMPLETA** - leggi prima di debuggare |

### Debug Voice Checklist

1. Audio non si sente? → Controlla event types Preview vs GA
2. session.update fallisce? → Formato diverso tra Preview e GA
3. Proxy non connette? → Verifica env vars `AZURE_OPENAI_REALTIME_*`
4. Audio distorto? → AudioContext playback DEVE essere 24kHz

### Env Vars Voice

```bash
AZURE_OPENAI_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_REALTIME_API_KEY=your-key
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime-preview  # Preview API!
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
