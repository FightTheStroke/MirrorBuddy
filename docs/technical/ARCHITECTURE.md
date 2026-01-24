# MirrorBuddy Architecture

> AI-powered educational platform for students with learning differences.
> Last updated: 2026-01-18

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Character System](#character-system)
4. [Educational Tools](#educational-tools)
5. [Gamification](#gamification)
6. [Accessibility](#accessibility)
7. [Audio System](#audio-system)
8. [State Management](#state-management)
9. [Database Schema](#database-schema)
10. [API Routes](#api-routes)
11. [Safety & Guardrails](#safety--guardrails)
12. [Key ADRs](#key-adrs)

---

## System Overview

```mermaid
flowchart TB
    subgraph Client["Client (Next.js 16)"]
        UI[React Components]
        Stores[Zustand Stores]
        Audio[Web Audio API]
    end

    subgraph Server["Server (API Routes)"]
        API[REST API]
        SSE[SSE Streaming]
        Voice[Realtime API Proxy]
    end

    subgraph AI["AI Layer"]
        Azure[Azure OpenAI]
        Ollama[Ollama Fallback]
        Safety[Safety Guardrails]
        RAG[RAG Retrieval]
    end

    subgraph Data["Data Layer"]
        Prisma[(Prisma ORM)]
        DB[(PostgreSQL + pgvector)]
    end

    subgraph Observability["Observability"]
        Metrics[Prometheus Push]
        Grafana[Grafana Cloud]
        Sentry[Sentry Error Tracking]
    end

    UI --> Stores
    Stores --> API
    UI --> Audio
    UI --> Voice

    API --> Safety
    SSE --> Safety
    Safety --> Azure
    Safety --> Ollama
    Azure --> RAG
    RAG --> DB

    API --> Prisma
    Prisma --> DB

    Voice --> Azure

    API --> Metrics
    Metrics --> Grafana

    UI --> Sentry
    API --> Sentry
```

## Overview

MirrorBuddy is a Next.js 16 application providing AI tutoring for K-12 students with learning differences (dyslexia, ADHD, autism, etc.).

### Tech Stack

| Layer         | Technology                                                          |
| ------------- | ------------------------------------------------------------------- |
| Frontend      | Next.js 16.1.1, React 19.2.3, TypeScript 5                          |
| Styling       | Tailwind CSS 4, Radix UI                                            |
| State         | Zustand 5.0.9 (no persist, API-synced)                              |
| Database      | Prisma + PostgreSQL 17 + pgvector (ADR 0028)                        |
| AI            | Azure OpenAI (primary), Ollama (fallback)                           |
| Voice         | Azure Realtime API (WebRTC)                                         |
| Audio         | Web Audio API (procedural generation)                               |
| Observability | Grafana Cloud + Prometheus push (ADR 0047), Sentry (error tracking) |
| RAG           | pgvector semantic search (ADR 0033)                                 |

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # REST API routes (50+)
│   └── [features]/        # Page routes (astuccio, flashcard, quiz, etc.)
├── components/            # React components (60+ features)
├── data/                  # Static data
│   ├── maestri/           # 20 AI maestro definitions
│   ├── buddy-profiles/    # 5 buddy definitions
│   └── support-teachers/  # 5 coach definitions
├── lib/
│   ├── ai/               # AI providers, intent detection, routing
│   ├── audio/            # Ambient audio generators
│   ├── conversation/     # Chat history & memory injection
│   ├── education/        # FSRS, adaptive difficulty, mastery
│   ├── observability/    # Prometheus push to Grafana Cloud
│   ├── privacy/          # GDPR compliance
│   ├── rag/              # Embeddings, semantic search (pgvector)
│   ├── realtime/         # SSE & tool events
│   ├── safety/           # Safety guardrails
│   ├── security/         # Auth, encryption, CSP
│   ├── stores/           # Zustand stores
│   └── tools/            # Tool handlers & plugins
├── hooks/                 # React hooks (20+)
└── types/                 # TypeScript definitions (barrel export)
```

---

## Core Concepts

### Triangle of Support (ADR-0003)

Three character types serve different educational needs:

```mermaid
flowchart TD
    Student((Student))

    subgraph Triangle["Triangle of Support"]
        Maestro["🎓 MAESTRO (20)<br/>Subject Expert<br/>Vertical • Content"]
        Coach["📚 COACH (5)<br/>Learning Method<br/>Vertical • Autonomy"]
        Buddy["🤝 BUDDY (5)<br/>Peer Support<br/>Horizontal • Emotional"]
    end

    Student --> |academic| Maestro
    Student --> |methodology| Coach
    Student --> |emotional| Buddy

    Maestro -.-> |handoff| Coach
    Coach -.-> |handoff| Buddy
    Buddy -.-> |handoff| Maestro
```

### Intent-Based Routing

```mermaid
flowchart LR
    Input[/"Student Message"/]
    Intent{Intent<br/>Detection}

    Input --> Intent

    Intent --> |academic| M[Maestro]
    Intent --> |methodology| C[Coach]
    Intent --> |emotional| B[Buddy]
    Intent --> |tech_support| C

    M --> |"Explain X"| Darwin[Darwin]
    M --> |"Math help"| Euclide[Euclide]
    C --> |"How to study"| Melissa[Melissa]
    B --> |"I'm frustrated"| Mario[Mario]
```

---

## Character System

### 20 Maestri (18 Teaching + 2 Amici)

| Maestro                 | Subject            | Type      | Voice   |
| ----------------------- | ------------------ | --------- | ------- |
| Euclide                 | Mathematics        | Maestro   | coral   |
| Marie Curie             | Chemistry          | Maestro   | shimmer |
| Richard Feynman         | Physics            | Maestro   | echo    |
| Galileo Galilei         | Astronomy          | Maestro   | verse   |
| Charles Darwin          | Biology/Sciences   | Maestro   | ballad  |
| Alessandro Manzoni      | Italian Literature | Maestro   | sage    |
| William Shakespeare     | English            | Maestro   | ash     |
| Erodoto                 | History            | Maestro   | ballad  |
| Alexander von Humboldt  | Geography          | Maestro   | echo    |
| Leonardo da Vinci       | Art                | Maestro   | coral   |
| Wolfgang Amadeus Mozart | Music              | Maestro   | verse   |
| Ada Lovelace            | Computer Science   | Maestro   | shimmer |
| Adam Smith              | Economics          | Maestro   | echo    |
| Socrate                 | Philosophy         | Maestro   | sage    |
| Marco Tullio Cicerone   | Civic Education    | Maestro   | ash     |
| Ippocrate               | Health             | Maestro   | coral   |
| Chris                   | Physical Education | Maestro   | alloy   |
| Omero                   | Storytelling       | Maestro   | verse   |
| Alex Pina               | Spanish            | Maestro   | coral   |
| **Mascetti**            | Supercazzola       | **Amico** | ballad  |

**Two Character Types**:

- **Maestro**: Has tools, earns XP, teaches (variable character intensity)
- **Amico**: No tools, `excludeFromGamification: true`, 100% character always

**Location**: `src/data/maestri/`

### 5 Learning Coaches

| Coach   | Personality              | Voice   | Best For                    |
| ------- | ------------------------ | ------- | --------------------------- |
| Melissa | Enthusiastic, young (27) | shimmer | Default, energetic students |
| Roberto | Calm, reassuring (28)    | echo    | Anxious students            |
| Chiara  | Organized, academic (24) | coral   | Structure-seekers           |
| Andrea  | Sporty, energetic (26)   | sage    | ADHD, movement needs        |
| Favij   | Gaming, digital (29)     | ballad  | Tech-savvy students         |

**Location**: `src/data/support-teachers.ts`

### 5 Peer Buddies (MirrorBuddy v2.0)

| Buddy | Personality               | Voice   |
| ----- | ------------------------- | ------- |
| Mario | Friendly, ironic          | echo    |
| Noemi | Empathetic, warm          | shimmer |
| Enea  | Playful, cheerful         | alloy   |
| Bruno | Thoughtful, introspective | sage    |
| Sofia | Creative, artistic        | coral   |

**MirrorBuddy Feature**: Buddies dynamically mirror the student's learning differences (dyslexia, ADHD, autism, etc.) so students feel understood.

**Location**: `src/data/buddy-profiles/` (modular structure)

---

## Educational Tools

### Tool Types

| Tool      | Handler                | Description                   |
| --------- | ---------------------- | ----------------------------- |
| Flashcard | `flashcard-handler.ts` | FSRS-5 spaced repetition      |
| Quiz      | `quiz-handler.ts`      | Multiple choice with feedback |
| MindMap   | `mindmap-handler.ts`   | MarkMap visualization         |
| Summary   | `summary-handler.ts`   | AI-generated summaries        |
| Demo      | `demo-handler.ts`      | Interactive simulations       |
| Diagram   | `diagram-handler.ts`   | Mermaid diagrams              |
| Timeline  | `timeline-handler.ts`  | Historical timelines          |

**Location**: `src/lib/tools/handlers/`

### FSRS Algorithm (ADR-0001)

Free Spaced Repetition Scheduler v5 implementation:

```typescript
// Core parameters
FSRS_INITIAL_STABILITY = 1.0    // days
FSRS_INITIAL_DIFFICULTY = 0.3
FSRS_DESIRED_RETENTION = 0.9    // 90% target
FSRS_K_FACTOR = 19.0            // stability growth

// Quality ratings
1 = Forgot (0.3x stability)
2 = Hard (0.6x stability)
3 = Good (0.85x stability)
4 = Easy (1.3x stability)
```

**Location**: `src/lib/education/fsrs/` (modular structure)

### Tool Execution (ADR-0009)

```mermaid
sequenceDiagram
    participant S as Student
    participant M as Maestro AI
    participant T as Tool Handler
    participant SSE as SSE Stream
    participant DB as Database

    S->>M: "Fammi una mappa su Roma"
    M->>M: Function Call: create_mindmap
    M->>T: Execute mindmap-handler
    T->>SSE: Stream chunks
    SSE-->>S: Real-time render
    T->>DB: Save material
    T->>M: Tool result
    M->>S: "Ecco la mappa!"
```

---

## Gamification

### XP & Leveling System

```typescript
// XP Sources
Lesson completed:     10-50 XP
Flashcard reviewed:   5 XP per card
Quiz completed:       10-30 XP (based on score)
Pomodoro completed:   15 XP

// 10 Levels
1. Principiante      0 XP
2. Apprendista       100 XP
3. Studente          300 XP
4. Studioso          600 XP
5. Esperto           1000 XP
6. Professore        1500 XP
7. Gran Professore   2200 XP
8. Saggio            3000 XP
9. Illuminato        4000 XP
10. Leggenda         5000 XP
```

### Streaks & Achievements

- **Daily Streak**: Study every day, milestone at 7/30/100/365 days
- **Achievements**: Categories include study, mastery, streak, social, exploration, xp
- **Subject Mastery**: 5 tiers from Beginner to Master

**Location**: `src/lib/stores/app-store.ts` (useProgressStore)

### Pomodoro Timer

- 25 min focus + 5 min break (configurable)
- Every 4 pomodoros: 15 min long break
- 15 XP per completed pomodoro
- Integrates with ambient audio (ADR-0018)

**Location**: `src/lib/stores/pomodoro-store.ts`

---

## Accessibility

### 7 Accessibility Profiles

| Profile        | Key Adaptations                             |
| -------------- | ------------------------------------------- |
| Dyslexia       | OpenDyslexic font, letter/line spacing      |
| ADHD           | Distraction-free, Pomodoro, break reminders |
| Visual         | High contrast, large text, TTS              |
| Motor          | Keyboard navigation, reduced motion         |
| Autism         | Reduced motion, sensory-friendly            |
| Auditory       | Visual cues, large text emphasis            |
| Cerebral Palsy | Keyboard nav, TTS, large text               |

### Accessibility Features

- **Font**: OpenDyslexic toggle
- **Text Size**: 0.8x - 1.5x multiplier
- **Line Spacing**: 1.0 - 2.0
- **Letter Spacing**: Adjustable
- **Contrast**: High contrast mode
- **Motion**: Reduced animations
- **TTS**: Auto-read with speed control (0.5x - 2.0x)
- **Colors**: Custom background/text

### Parent/Student Context Separation

The accessibility system supports separate settings for parents and students:

```typescript
type AccessibilityContext = "student" | "parent";

interface AccessibilityStore {
  settings: AccessibilitySettings; // Student settings
  parentSettings: AccessibilitySettings; // Parent settings
  currentContext: AccessibilityContext; // Active context

  setContext: (context) => void; // Switch context
  getActiveSettings: () => Settings; // Get current settings
  updateParentSettings: (updates) => void; // Update parent settings
}
```

- When viewing the Parent Dashboard (Genitori), context switches to 'parent'
- Each context has independent accessibility preferences
- `AccessibilityProvider` uses `getActiveSettings()` to apply the correct settings

**Location**: `src/lib/accessibility/`

---

## Audio System

### Voice API (Azure Realtime)

Real-time voice chat with all characters:

```typescript
// Voice configuration
voices: ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse']
VAD sensitivity: 0.3 - 0.7
Silence duration: 300 - 800ms
Barge-in: Interrupt while speaking
```

**Features**:

- Real-time transcription
- Tool execution during voice
- Audio level monitoring
- HTTPS required

**Location**: `src/app/api/realtime/`

### Ambient Audio (ADR-0018)

Procedural audio generation via Web Audio API:

```typescript
// 9 Audio Modes
white_noise, pink_noise, brown_noise,
binaural_alpha (8-14 Hz), binaural_beta (14-30 Hz), binaural_theta (4-8 Hz),
rain, thunderstorm, fireplace, cafe, library, forest, ocean, night

// 7 Presets
deep_work:   binaural_beta + brown_noise
library:     library + white_noise
starbucks:   café ambience
rainy_day:   rain + fireplace + thunder
nature:      forest + ocean
focus:       binaural_alpha
creative:    binaural_theta + forest
```

**Pomodoro Integration**:

- Auto-start with Pomodoro
- Pause during breaks
- Auto-duck during voice/TTS

**Location**: `src/lib/audio/`, `src/lib/stores/ambient-audio-store.ts`

---

## State Management

### Zustand Stores (ADR-0015)

**No localStorage** - All state synced via REST APIs:

```mermaid
flowchart LR
    subgraph Client["Zustand Stores"]
        Settings[useSettingsStore]
        Progress[useProgressStore]
        Voice[useVoiceSessionStore]
        Conv[useConversationStore]
        Pomo[usePomodoroStore]
        Audio[useAmbientAudioStore]
        Notif[useNotificationStore]
    end

    subgraph API["REST API"]
        A1["/api/user/settings"]
        A2["/api/progress"]
        A3["/api/conversations"]
        A4["/api/notifications"]
    end

    Settings --> A1
    Progress --> A2
    Conv --> A3
    Notif --> A4
    Pomo --> A2

    Voice -.-> |in-memory| Voice
    Audio -.-> |in-memory| Audio
```

| Store                | Purpose                     | Sync Endpoint                             |
| -------------------- | --------------------------- | ----------------------------------------- |
| useSettingsStore     | Theme, AI provider, profile | `/api/user/settings`, `/api/user/profile` |
| useProgressStore     | XP, levels, streaks         | `/api/progress`                           |
| useVoiceSessionStore | Voice connection state      | In-memory only                            |
| useConversationStore | Chat history                | `/api/conversations`                      |
| usePomodoroStore     | Timer state                 | `/api/progress` (on complete)             |
| useAmbientAudioStore | Audio playback              | In-memory only                            |
| useNotificationStore | Notifications               | `/api/notifications`                      |

**Sync Pattern**:

```typescript
// Optimistic updates with batched sync
store.update(state) → UI updates immediately
store.syncToServer() → Batched API call (fire-and-forget)
store.loadFromServer() → Hydrate on app start
```

---

## Database Schema

### Core Models (Prisma)

```mermaid
erDiagram
    User ||--|| Profile : has
    User ||--|| Settings : has
    User ||--|| AccessibilitySettings : has
    User ||--|| Progress : has
    User ||--o{ Conversation : has
    User ||--o{ FlashcardProgress : has
    User ||--o{ QuizResult : has
    User ||--o{ Material : has
    User ||--o{ StudySession : has
    User ||--o{ Notification : has
    User ||--|| StudentInsightProfile : has
    User ||--|| StudySchedule : has

    Conversation ||--o{ Message : contains

    StudentInsightProfile ||--o{ ProfileAccessLog : tracks

    StudySchedule ||--o{ ScheduledSession : has
    StudySchedule ||--o{ CustomReminder : has

    User {
        string id PK
        datetime createdAt
        datetime updatedAt
    }

    Progress {
        int xp
        int level
        int streakDays
        json achievements
    }

    FlashcardProgress {
        float difficulty
        float stability
        datetime nextReview
    }

    Conversation {
        string maestroId
        string title
        datetime updatedAt
    }
```

### Key Indexes

- `FlashcardProgress`: `nextReview`, `userId` (due cards lookup)
- `Conversation`: `userId`, `maestroId`, `updatedAt` (list views)
- `Message`, `QuizResult`, `TelemetryEvent`: `userId`, `createdAt` (sorting)

**Location**: `prisma/schema.prisma`

---

## API Routes

### Categories

| Category      | Routes                                | Description                    |
| ------------- | ------------------------------------- | ------------------------------ |
| User          | `/api/user/*`                         | Settings, profile, data export |
| Progress      | `/api/progress/*`                     | XP, sessions, autonomy         |
| Flashcards    | `/api/flashcards/*`                   | FSRS state sync                |
| Conversations | `/api/conversations/*`                | Chat history, messages         |
| Tools         | `/api/tools/*`                        | Tool creation, SSE streaming   |
| Voice         | `/api/realtime/*`                     | Token, status                  |
| Notifications | `/api/notifications/*`, `/api/push/*` | In-app, PWA push               |
| Parent        | `/api/parent-professor/*`             | Dashboard, GDPR consent        |
| Telemetry     | `/api/telemetry/*`                    | Usage analytics                |

### Auth Pattern

Cookie-based session via `convergio-user-id`:

```typescript
const userId = cookieStore.get("convergio-user-id")?.value;
if (!userId)
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

---

## Conversational Memory (ADR-0021)

### Memory Injection System

Maestros remember previous conversations through memory injection:

```mermaid
flowchart LR
    Start[/"New Conversation"/]
    Load["Load Previous Context"]
    DB[(Database)]
    Enhance["Enhance System Prompt"]
    AI["AI with Memory"]

    Start --> Load
    Load --> DB
    DB --> |"summaries, keyFacts, topics"| Enhance
    Enhance --> AI
```

### Memory Components

| Component       | File                                      | Purpose                          |
| --------------- | ----------------------------------------- | -------------------------------- |
| Memory Loader   | `src/lib/conversation/memory-loader.ts`   | Load last 3 conversations        |
| Prompt Enhancer | `src/lib/conversation/prompt-enhancer.ts` | Inject memory into system prompt |

### Memory Context Structure

```typescript
interface ConversationMemory {
  recentSummary: string | null; // Last session recap
  keyFacts: string[]; // Student preferences, decisions
  topics: string[]; // Discussed subjects
  lastSessionDate: Date | null; // For relative dating
}
```

### Token Budget

| Component          | Max Tokens |
| ------------------ | ---------- |
| Base System Prompt | ~800       |
| Recent Summary     | ~200       |
| Key Facts (max 5)  | ~100       |
| Topics (max 10)    | ~50        |
| **Total Enhanced** | **~1150**  |

---

## Knowledge Hub (ADR-0022)

### Architecture

File-manager style interface for all educational materials:

```mermaid
flowchart TB
    subgraph Views["View Modes"]
        Explorer["📁 Explorer"]
        Gallery["🖼️ Gallery"]
        Timeline["📅 Timeline"]
        Calendar["📆 Calendar"]
    end

    subgraph Components["Components"]
        Search["🔍 SearchBar"]
        Sidebar["📂 SidebarNav"]
        Cards["📇 MaterialCards"]
        Bulk["⚡ BulkToolbar"]
    end

    subgraph Renderers["12 Renderers"]
        MR["MindmapRenderer"]
        QR["QuizRenderer"]
        FR["FlashcardRenderer"]
        SR["SummaryRenderer"]
        DR["DemoRenderer"]
        More["...8 more"]
    end

    Views --> Components
    Components --> Renderers
```

### Directory Structure

```
src/components/education/knowledge-hub/
├── knowledge-hub.tsx           # Main orchestrator
├── hooks/
│   ├── use-materials-search.ts # Fuse.js fuzzy search
│   ├── use-collections.ts      # Folders CRUD
│   ├── use-tags.ts             # Tags CRUD
│   ├── use-smart-collections.ts # Dynamic collections
│   └── use-bulk-actions.ts     # Multi-select operations
├── views/
│   ├── explorer-view.tsx       # Sidebar + grid
│   ├── gallery-view.tsx        # Large cards
│   ├── timeline-view.tsx       # Chronological
│   └── calendar-view.tsx       # Calendar view
├── components/
│   ├── search-bar.tsx          # Search with type filter
│   ├── sidebar-navigation.tsx  # Collections & tags
│   ├── material-card.tsx       # Card with drag & drop
│   ├── bulk-toolbar.tsx        # Bulk actions
│   └── stats-panel.tsx         # Statistics
└── renderers/
    ├── index.tsx               # Registry with lazy loading
    └── *-renderer.tsx          # 12 type-specific renderers
```

### Full-Text Search

```typescript
// Pre-computed on save
searchableText = generateSearchableText(toolType, content);

// Client-side fuzzy search with Fuse.js
const fuse = new Fuse(materials, {
  keys: ["title", "subject", "searchableText"],
  threshold: 0.3,
  includeMatches: true,
});
```

### Smart Collections

| Collection       | Filter                            |
| ---------------- | --------------------------------- |
| Da ripassare     | Flashcards with nextReview <= now |
| Recenti          | Created in last 7 days            |
| Preferiti        | isBookmarked = true               |
| Per Maestro      | Group by maestroId                |
| Oggi             | Created today                     |
| Questa settimana | Created this week                 |

---

## Tool Focus Selection (ADR-0020)

### Dialog Flow

When creating educational tools, users first select maestro and mode:

```mermaid
flowchart LR
    Click["Click 'Nuova Mappa'"]
    Dialog["Selection Dialog"]
    Select["Select Maestro"]
    Mode["Select Mode"]
    Create["Create Tool"]

    Click --> Dialog
    Dialog --> Select
    Select --> Mode
    Mode --> |text/voice| Create
```

### Components

| Component                    | Purpose                              |
| ---------------------------- | ------------------------------------ |
| `ToolMaestroSelectionDialog` | Modal for selecting maestro and mode |
| `focus-tool-layout.tsx`      | Layout with voice integration        |

### Mode Types

- **Text**: Traditional chat-based tool creation
- **Voice**: Real-time voice conversation with maestro

---

## Safety & Guardrails

### 5-Layer Defense System (ADR-0004)

```mermaid
flowchart TB
    Input[/"Student Input"/]

    subgraph Safety["5-Layer Defense"]
        L1["🛡️ Layer 1: System Prompt<br/>Safety rules injected"]
        L2["🚫 Layer 2: Input Filter<br/>Block inappropriate"]
        L3["🔍 Layer 3: Jailbreak Detector<br/>Catch manipulation"]
        L4["🤖 Layer 4: AI Processing<br/>Generate response"]
        L5["✨ Layer 5: Output Sanitizer<br/>Clean response"]
    end

    Crisis{Crisis<br/>Detected?}
    Output[/"Safe Response"/]
    Escalate["⚠️ Escalate to<br/>Trusted Adult"]

    Input --> L1
    L1 --> L2
    L2 --> L3
    L3 --> L4
    L4 --> L5
    L5 --> Crisis

    Crisis -->|No| Output
    Crisis -->|Yes| Escalate
```

### Safety Modules

| Module                  | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `safety-prompts.ts`     | Core injection, crisis keywords                   |
| `content-filter.ts`     | Input filtering, blocked patterns                 |
| `output-sanitizer.ts`   | Output cleaning, streaming sanitizer              |
| `jailbreak-detector.ts` | Manipulation attempt detection                    |
| `age-gating.ts`         | Age-appropriate content (6-10, 11-13, 14-18, 18+) |
| `monitoring.ts`         | Safety event logging, session termination         |

**Location**: `src/lib/safety/`

### Crisis Response

- Crisis keywords trigger escalation to trusted adult
- Session can be auto-terminated for safety
- All safety events logged for review

---

## RAG System (ADR 0033)

### Semantic Search Architecture

```mermaid
flowchart LR
    Input[/"User Query"/]
    Embed["Azure Embeddings<br/>text-embedding-3-small"]
    Vector[(pgvector<br/>1536 dims)]
    Results["Top 3 Materials"]
    Context["Enhanced Prompt"]

    Input --> Embed
    Embed --> Vector
    Vector --> |"cosine similarity"| Results
    Results --> Context
```

### Components

| Component         | File                               | Purpose                 |
| ----------------- | ---------------------------------- | ----------------------- |
| Embedding Service | `src/lib/rag/embedding-service.ts` | Azure OpenAI embeddings |
| Retrieval Service | `src/lib/rag/retrieval-service.ts` | Similarity search       |
| Vector Store      | `src/lib/rag/vector-store.ts`      | pgvector queries        |
| Semantic Chunker  | `src/lib/rag/semantic-chunker.ts`  | Content chunking        |

### Configuration

```typescript
// Embedding model
AZURE_OPENAI_EMBEDDING_DEPLOYMENT = text - embedding - 3 - small;
EMBEDDING_DIMENSIONS = 1536;

// Search parameters
MIN_SIMILARITY_THRESHOLD = 0.6;
MAX_CONTEXT_MATERIALS = 3;
MAX_CONTEXT_TOKENS = 1500;
```

### Storage

- **ContentEmbedding table**: Native pgvector storage
- **Cosine distance**: `<=>` operator for similarity
- **Graceful degradation**: Falls back if embedding service unavailable

---

## Observability (ADR 0047)

### Grafana Cloud Integration

```mermaid
flowchart LR
    App["Next.js App"]
    Push["Prometheus Push<br/>(Remote Write)"]
    Grafana["Grafana Cloud"]
    Dashboard["Dashboard"]

    App --> |"metrics every 60s"| Push
    Push --> Grafana
    Grafana --> Dashboard
```

### Metric Categories

**SLI/SLO Metrics**:

- Session success rate, drop-off, stuck loops
- Safety incidents (S0-S3), jailbreak blocks
- Latency percentiles (P50/P95/P99)

**Business Metrics**:

- DAU/WAU/MAU, registrations
- Onboarding completion, voice adoption
- Retention cohorts (D1/D7/D30)
- Maestri usage, XP earned, streaks

### Health Endpoints

| Endpoint                   | Purpose                        |
| -------------------------- | ------------------------------ |
| `GET /api/health`          | Basic health (k8s probes)      |
| `GET /api/health/detailed` | Full metrics (debugging)       |
| `GET /api/metrics`         | Prometheus format (pull-based) |

### Push Service

**Location**: `src/lib/observability/prometheus-push-service.ts`

```typescript
// Configuration
GRAFANA_CLOUD_PROMETHEUS_URL=https://...
GRAFANA_CLOUD_PROMETHEUS_USER=...
GRAFANA_CLOUD_API_KEY=...

// Push interval: 60s (min 15s)
// Labels: instance, environment
```

---

## Key ADRs

| ADR  | Title                       | Decision                                      |
| ---- | --------------------------- | --------------------------------------------- |
| 0001 | Materials Storage           | Provider-agnostic (local/Azure Blob)          |
| 0003 | Triangle of Support         | 3 character types (Maestro/Coach/Buddy)       |
| 0004 | Safety Guardrails           | 5-layer defense for child protection          |
| 0005 | Real-time Tools             | SSE for streaming tool creation               |
| 0009 | Tool Execution              | OpenAI function calling                       |
| 0015 | Database-First              | No localStorage, API-synced                   |
| 0021 | Conversational Memory       | Memory injection into system prompts          |
| 0022 | Knowledge Hub               | File-manager interface for materials          |
| 0027 | Bilingual Voice             | Auto language detection for language teachers |
| 0028 | PostgreSQL Migration        | PostgreSQL 17 + pgvector for semantic search  |
| 0031 | Embedded Knowledge          | Character intensity dial for maestri          |
| 0033 | RAG Semantic Search         | pgvector embeddings with Azure OpenAI         |
| 0034 | Chat Streaming              | Native SSE for chat responses                 |
| 0037 | Tool Plugin Architecture    | Extensible tool system                        |
| 0045 | Domain Boundaries           | Barrel exports, circular import prevention    |
| 0047 | Grafana Cloud Observability | Prometheus push metrics                       |
| 0051 | Claude Code Optimization    | Token-efficient CLAUDE.md                     |

**51+ ADRs total** - See `docs/adr/` for complete list

---

## Quick Reference

### Commands

```bash
npm run dev          # Dev server :3000
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test         # Playwright E2E
npx prisma generate  # After schema changes
npx prisma db push   # Sync schema
```

### Key Paths

| Purpose       | Path                         |
| ------------- | ---------------------------- |
| Types         | `src/types/index.ts`         |
| AI Providers  | `src/lib/ai/providers/`      |
| RAG           | `src/lib/rag/`               |
| Safety        | `src/lib/safety/`            |
| FSRS          | `src/lib/education/fsrs/`    |
| Accessibility | `src/lib/accessibility/`     |
| Observability | `src/lib/observability/`     |
| Maestri       | `src/data/maestri/`          |
| Coaches       | `src/data/support-teachers/` |
| Buddies       | `src/data/buddy-profiles/`   |
| Stores        | `src/lib/stores/`            |
| API           | `src/app/api/`               |
| Tools         | `src/lib/tools/`             |

---

## Statistics

- **Components**: 150+ React components
- **API Routes**: 50+ REST endpoints
- **Zustand Stores**: 10+ stores
- **Prisma Models**: 25+ models
- **Maestri**: 20 (18 teaching + 2 amici)
- **Coaches**: 5 learning coaches
- **Buddies**: 5 peer buddies
- **Accessibility Profiles**: 7 DSA profiles
- **Audio Modes**: 14 procedural modes
- **Audio Presets**: 7 focus presets
- **Safety Layers**: 5 defense layers
- **ADRs**: 51+ architecture decisions
- **Knowledge Hub Renderers**: 12 type-specific renderers
- **Unit Tests**: 5169+ tests
- **E2E Tests**: 229 Playwright tests
- **Test Coverage**: 80%+ business logic
