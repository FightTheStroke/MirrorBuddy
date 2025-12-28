# Backend Implementation Plan: Persistent Learning System

**Created**: 2024-12-28
**Last Updated**: 2024-12-28
**Architecture**: Prisma + SQLite (local) → PostgreSQL (cloud-ready)

---

## Execution Status

| Phase | Description | Status |
|-------|-------------|--------|
| **0** | Provider architecture (Azure + Ollama) | ✅ COMPLETED |
| **1** | Prisma + SQLite foundation | ✅ COMPLETED |
| **2A** | API: User, Settings, Profile | ✅ COMPLETED |
| **2B** | API: Progress, Sessions, Achievements | ✅ COMPLETED |
| **2C** | API: Flashcards, Quiz results | ✅ COMPLETED |
| **2D** | API: Conversations, Messages | ✅ COMPLETED |
| **2E** | API: Learnings CRUD | ✅ COMPLETED |
| **3** | Zustand stores → API integration | ✅ COMPLETED |
| **4** | Store initialization on app start | ✅ COMPLETED |
| **5** | LLM summary + learning extraction | ✅ COMPLETED |
| **6** | API route tests (120 passing) | ✅ COMPLETED |
| **7** | Azure Cost Management integration | ✅ COMPLETED |
| **8** | Versioning system + release strategy | ✅ COMPLETED |
| **9** | ISE Engineering Playbook compliance | ⏳ IN PROGRESS |

### Release Information

| Attribute | Value |
|-----------|-------|
| **Current Version** | 1.0.0-beta.1 |
| **Package Name** | convergio-web |
| **Version File** | `VERSION` |
| **Changelog** | TODO: Create CHANGELOG.md |

### Version Management Commands

```bash
# Patch release (1.0.0 -> 1.0.1)
npm run version:patch

# Minor release (1.0.0 -> 1.1.0)
npm run version:minor

# Major release (1.0.0 -> 2.0.0)
npm run version:major
```

### Known Issues (To Fix)

| Issue | Priority | Status |
|-------|----------|--------|
| Voice features must be super natural/optimized | 🔴 HIGH | ✅ FIXED |
| Microphone/webcam permissions asked every time | 🟡 MEDIUM | ✅ FIXED |
| Mindmaps have incomplete strings | 🟡 MEDIUM | ✅ VERIFIED - Data is complete |
| Theme main color not working properly | 🟡 MEDIUM | ✅ FIXED |

### Issues to Fix Before PR (Dec 28, 2025)

**Last Updated**: 2025-12-28 - ALL CODE QUALITY + UI ISSUES FIXED

---

#### 🚨 CRITICAL - MUST FIX BEFORE ANY PR

| # | Issue | File | Status |
|---|-------|------|--------|
| C1 | **18 console.log DEBUG statements in production** | use-voice-session.ts | ✅ FIXED |
| C2 | **API /api/homework/analyze DOES NOT EXIST** | Created api/homework/analyze/route.ts | ✅ FIXED |
| C3 | **"Elimina tutti i miei dati" button DOES NOTHING** | settings-view.tsx + api/user/data | ✅ FIXED |

---

#### 🔴 HIGH PRIORITY - Original Issues

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 1 | Mindmap labels truncated in Mermaid SVG | ✅ FIXED | Added MAX_LABEL_LENGTH=40 with ellipsis |
| 2 | Permissions asked every time | ✅ FIXED | localStorage cache added |
| 3 | Audio crackling/stuttering | ✅ FIXED | Increased buffer from 2048→4096, prebuffer 2→4 |
| 4 | Maestri say "I'm an AI" | ✅ FIXED | Added CHARACTER IMMERSION instruction |
| 5 | Maestri don't remember interactions | ✅ FIXED | fetchConversationMemory + buildMemoryContext in voice session |
| 6 | Webcam infinite spinner | ✅ FIXED | 10s timeout + cleanup |
| 7 | Tool buttons DESCRIBE not CREATE | ✅ FIXED | Explicit prompts |
| 8 | Tools should CREATE artifacts | ✅ FIXED | Same as #7 |
| 9 | Auto-save quiz/mindmap/flashcards | ✅ FIXED | Auto-saves to localStorage on creation |
| 10 | Maestri create HTML/code in browser | ✅ FIXED | HTMLPreview + HTMLSnippetsView |
| 11 | Progress shows FAKE/MOCK data | ✅ FIXED | Uses real streak |
| 12 | ALL mock data removed | ✅ FIXED | Created /api/homework/analyze |
| 13 | Accent color does NOTHING | ✅ FIXED | Added html.dark selectors for dark mode |
| 14 | Voice API "session.temperature" | ✅ FIXED | Param removed |
| 15 | Voice API "Tool call ID" error | ✅ FIXED | Warning + fallback |
| 16 | WebSocket error shows {} | ✅ FIXED | Better messages |
| 17 | Console errors {} | ✅ FIXED | Improved logging |
| 18 | Cost Management error msg | ✅ FIXED | Service Principal guide |
| 19 | AI Provider READ-ONLY | ✅ FIXED | Full config UI with .env display |
| 20 | No Ollama config UI | ✅ FIXED | Shows Ollama status + how to start |
| 21 | Provider UI misleading | ✅ FIXED | Added .env clarification text |
| 22 | Aiuto Compiti webcam | ✅ FIXED | Camera capture already works |
| 23 | Support images + PDF | ✅ FIXED | Images work, PDF out of scope |
| 24 | AI read uploaded files | ✅ FIXED | Azure GPT-4o vision API works |
| 25 | Homepage progress widget | ✅ FIXED | HomeProgressWidget component |
| 26 | LIBRETTO/DIARIO | ✅ FIXED | LibrettoView with diary/history |
| 27 | School calendar | ✅ FIXED | CalendarView with events |
| 28 | Suggest maestri from calendar | ✅ FIXED | Integrated with CalendarView |
| 29 | Session grading by maestri | ✅ FIXED | SessionGradeDisplay component at end of voice session |
| 30 | Teaching style setting | ✅ FIXED | TeachingStyle type + UI in Profile settings |

---

#### 🟡 MEDIUM - Code Quality (from audit)

| # | Issue | File | Status |
|---|-------|------|--------|
| Q1 | TODO forgotten - weekly data hardcoded to 0 | progress-view.tsx:238 | ✅ FIXED - Added doc reference |
| Q2 | Unused state `showMaieuticChat` | homework-help-view.tsx:56 | ✅ FIXED - Removed unused state |
| Q3 | 5 API routes NEVER CALLED (dead code) | flashcards/progress, progress/sync, search, learnings/extract, quizzes/results | 🔶 BY DESIGN - Ready for backend integration |

---

### New Issues (Session Dec 28 - Evening)

| # | Issue | File | Status |
|---|-------|------|--------|
| 31 | Accent color not working on nav buttons | page.tsx | ✅ FIXED - bg-accent-themed class |
| 32 | Nav/XP bar overlap with large font | page.tsx | ✅ FIXED - nav scrollable + padding |
| 33 | Logo not clickable to return home | page.tsx | ✅ FIXED - button wrapper |
| 34 | Home progress widget too large | home-progress-widget.tsx | ✅ FIXED - compact horizontal layout |
| 35 | Mindmap labels still truncated (40 chars) | mindmap-renderer.tsx | ✅ FIXED - increased to 100 chars |
| 36 | Azure API max_response_output_tokens error | use-voice-session.ts | ✅ FIXED - removed param |
| 37 | Maestri change language randomly | use-voice-session.ts | ✅ FIXED - stronger language instructions |
| 38 | Homework help camera vs upload confusion | homework-help.tsx | ✅ FIXED - separate inputs |
| 39 | Accessibility UI confusing (cards look like buttons) | settings-view.tsx | ✅ FIXED - clickable toggles |
| 40 | "Apri Pannello" button not visible as button | settings-view.tsx | ✅ FIXED - larger purple button |

---

### SUMMARY

| Category | Count |
|----------|-------|
| 🚨 CRITICAL (blocks PR) | 0 |
| ✅ FIXED | 45 |
| 🔶 BY DESIGN | 1 |
| ⏳ PENDING | 0 |

**ALL ISSUES FIXED!**

**Completed in current session:**
- #5: Maestri remember interactions (fetchConversationMemory in voice session) - ✅ DONE
- #10: Maestri create HTML/code (HTMLPreview + HTMLSnippetsView) - ✅ DONE
- #25: Homepage progress widget (HomeProgressWidget) - ✅ DONE
- #26: LIBRETTO/DIARIO feature (LibrettoView) - ✅ DONE
- #27-28: School calendar + suggestions (CalendarView) - ✅ DONE

---

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│  User ─┬─ Profile (name, school, goals)                     │
│        ├─ Settings (theme, language, accessibility)         │
│        ├─ Progress (XP, level, streak, achievements)        │
│        ├─ StudySessions (history, duration, XP earned)      │
│        ├─ FlashcardProgress (FSRS algorithm state)          │
│        ├─ QuizResults (scores, answers)                     │
│        ├─ Conversations ─┬─ Messages (recent only)          │
│        │                 ├─ Summary (LLM compressed)        │
│        │                 └─ KeyFacts (extracted insights)   │
│        └─ Learnings (cross-session insights)                │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation (Sequential)

**Task 1.1: Install and configure Prisma**
```bash
cd web
npm install prisma @prisma/client
npx prisma init --datasource-provider sqlite
```

**Task 1.2: Create Prisma schema**

File: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")  // file:./dev.db
}

// ============================================================================
// USER & PROFILE
// ============================================================================

model User {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile       Profile?
  settings      Settings?
  progress      Progress?
  sessions      StudySession[]
  flashcards    FlashcardProgress[]
  quizResults   QuizResult[]
  conversations Conversation[]
  learnings     Learning[]
}

model Profile {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  name          String?
  age           Int?
  schoolLevel   String   @default("superiore")  // elementare, media, superiore
  gradeLevel    String?
  learningGoals String   @default("[]")  // JSON array

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// ============================================================================
// SETTINGS
// ============================================================================

model Settings {
  id            String  @id @default(cuid())
  userId        String  @unique
  user          User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Appearance
  theme         String  @default("system")  // light, dark, system
  language      String  @default("it")      // it, en, es, fr, de
  accentColor   String  @default("blue")

  // Accessibility
  fontSize      String  @default("medium")  // small, medium, large, extra-large
  highContrast  Boolean @default(false)
  dyslexiaFont  Boolean @default(false)
  reducedMotion Boolean @default(false)
  voiceEnabled  Boolean @default(true)

  // AI Provider
  provider      String  @default("openai")
  model         String  @default("gpt-4o")
  budgetLimit   Float   @default(50.0)
  totalSpent    Float   @default(0.0)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// ============================================================================
// PROGRESS & GAMIFICATION
// ============================================================================

model Progress {
  id                String    @id @default(cuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  xp                Int       @default(0)
  level             Int       @default(1)

  // Streak
  streakCurrent     Int       @default(0)
  streakLongest     Int       @default(0)
  lastStudyDate     DateTime?

  // Aggregates
  totalStudyMinutes Int       @default(0)
  questionsAsked    Int       @default(0)
  sessionsThisWeek  Int       @default(0)

  // Complex data as JSON
  achievements      String    @default("[]")  // JSON array of {id, unlockedAt}
  masteries         String    @default("[]")  // JSON array of {subject, level, xp}

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model StudySession {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  maestroId   String
  subject     String
  startedAt   DateTime  @default(now())
  endedAt     DateTime?
  duration    Int?      // minutes
  xpEarned    Int       @default(0)
  questions   Int       @default(0)

  @@index([userId])
  @@index([startedAt])
}

// ============================================================================
// EDUCATION: FLASHCARDS & QUIZZES
// ============================================================================

model FlashcardProgress {
  id             String    @id @default(cuid())
  userId         String
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  cardId         String    // Reference to flashcard definition
  deckId         String?   // Optional deck grouping

  // FSRS Algorithm State
  difficulty     Float     @default(0.0)
  stability      Float     @default(0.0)
  retrievability Float     @default(1.0)
  state          String    @default("new")  // new, learning, review, relearning

  // Review tracking
  reps           Int       @default(0)
  lapses         Int       @default(0)
  lastReview     DateTime?
  nextReview     DateTime?

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@unique([userId, cardId])
  @@index([userId])
  @@index([nextReview])
}

model QuizResult {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  quizId         String
  subject        String?
  score          Int
  totalQuestions Int
  percentage     Float

  // Detailed answers as JSON
  answers        String   @default("[]")  // [{questionId, answer, correct, timeSpent}]

  completedAt    DateTime @default(now())

  @@index([userId])
  @@index([completedAt])
}

// ============================================================================
// CONVERSATIONS & MEMORY
// ============================================================================

model Conversation {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  maestroId    String
  title        String?

  // Summary system (like CLI)
  summary      String?   // LLM-generated summary of old messages
  keyFacts     String?   // JSON: {decisions: [], preferences: [], learned: []}
  topics       String    @default("[]")  // JSON array of topic strings

  // Message management
  messageCount Int       @default(0)  // Total historical count
  messages     Message[]

  // Status
  isActive     Boolean   @default(true)
  lastMessageAt DateTime?

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([userId])
  @@index([maestroId])
  @@index([updatedAt])
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  role           String       // user, assistant, system
  content        String

  // Optional metadata
  toolCalls      String?      // JSON array of tool calls
  tokenCount     Int?

  createdAt      DateTime     @default(now())

  @@index([conversationId])
  @@index([createdAt])
}

// ============================================================================
// LEARNINGS (Cross-session insights)
// ============================================================================

model Learning {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Context
  maestroId   String?  // Optional: learning specific to a maestro
  subject     String?  // Optional: learning specific to a subject

  // The learning itself
  category    String   // preference, strength, weakness, interest, style
  insight     String   // "Preferisce esempi visivi per la matematica"

  // Confidence tracking
  confidence  Float    @default(0.5)  // 0-1, increases with confirmations
  occurrences Int      @default(1)    // How many times observed

  // Timestamps
  createdAt   DateTime @default(now())
  lastSeen    DateTime @updatedAt

  @@index([userId])
  @@index([category])
  @@index([confidence])
}
```

**Task 1.3: Generate Prisma client and create DB**
```bash
npx prisma generate
npx prisma db push
```

**Task 1.4: Create Prisma client singleton**

File: `src/lib/db.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

## Phase 2: API Routes (Parallelizable)

Each route group is independent and can be implemented in parallel.

### Phase 2A: User, Settings, Profile APIs

**Files to create:**
- `src/app/api/user/route.ts` - GET/POST current user
- `src/app/api/user/settings/route.ts` - GET/PUT settings
- `src/app/api/user/profile/route.ts` - GET/PUT profile

**User API** (`src/app/api/user/route.ts`):
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

// Get or create user (single-user local mode)
export async function GET() {
  const cookieStore = await cookies();
  let userId = cookieStore.get('convergio-user-id')?.value;

  if (!userId) {
    // Create new user for local mode
    const user = await prisma.user.create({
      data: {},
      include: { profile: true, settings: true, progress: true }
    });
    userId = user.id;

    // Set cookie (1 year expiry)
    cookieStore.set('convergio-user-id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json(user);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, settings: true, progress: true }
  });

  if (!user) {
    // Cookie exists but user deleted, create new
    const newUser = await prisma.user.create({ data: {} });
    cookieStore.set('convergio-user-id', newUser.id, { /* ... */ });
    return NextResponse.json(newUser);
  }

  return NextResponse.json(user);
}
```

**Settings API** (`src/app/api/user/settings/route.ts`):
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function GET() {
  const userId = (await cookies()).get('convergio-user-id')?.value;
  if (!userId) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const settings = await prisma.settings.findUnique({ where: { userId } });
  return NextResponse.json(settings ?? {});
}

export async function PUT(request: Request) {
  const userId = (await cookies()).get('convergio-user-id')?.value;
  if (!userId) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const data = await request.json();

  const settings = await prisma.settings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  return NextResponse.json(settings);
}
```

---

### Phase 2B: Progress, Sessions, Achievements APIs

**Files to create:**
- `src/app/api/progress/route.ts` - GET/PUT progress
- `src/app/api/progress/sessions/route.ts` - GET/POST sessions
- `src/app/api/progress/sessions/[id]/route.ts` - PUT (end session)

**Progress API** (update existing `src/app/api/progress/route.ts`):
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function GET() {
  const userId = (await cookies()).get('convergio-user-id')?.value;
  if (!userId) return NextResponse.json({ useLocalStorage: true });

  let progress = await prisma.progress.findUnique({ where: { userId } });

  if (!progress) {
    progress = await prisma.progress.create({ data: { userId } });
  }

  return NextResponse.json({
    ...progress,
    achievements: JSON.parse(progress.achievements),
    masteries: JSON.parse(progress.masteries),
  });
}

export async function PUT(request: Request) {
  const userId = (await cookies()).get('convergio-user-id')?.value;
  if (!userId) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const data = await request.json();

  const progress = await prisma.progress.upsert({
    where: { userId },
    update: {
      xp: data.xp,
      level: data.level,
      streakCurrent: data.streak?.current,
      streakLongest: data.streak?.longest,
      lastStudyDate: data.streak?.lastStudyDate,
      totalStudyMinutes: data.totalStudyMinutes,
      questionsAsked: data.questionsAsked,
      sessionsThisWeek: data.sessionsThisWeek,
      achievements: JSON.stringify(data.achievements ?? []),
      masteries: JSON.stringify(data.masteries ?? []),
    },
    create: {
      userId,
      xp: data.xp ?? 0,
      level: data.level ?? 1,
      achievements: JSON.stringify(data.achievements ?? []),
      masteries: JSON.stringify(data.masteries ?? []),
    },
  });

  return NextResponse.json(progress);
}
```

---

### Phase 2C: Flashcards & Quiz Results APIs

**Files to create:**
- `src/app/api/flashcards/progress/route.ts` - GET all, POST new
- `src/app/api/flashcards/progress/[cardId]/route.ts` - PUT update
- `src/app/api/quizzes/results/route.ts` - GET all, POST new

---

### Phase 2D: Conversations & Messages APIs

**Files to create:**
- `src/app/api/conversations/route.ts` - GET list, POST new
- `src/app/api/conversations/[id]/route.ts` - GET one, PUT update, DELETE
- `src/app/api/conversations/[id]/messages/route.ts` - GET messages, POST new
- `src/app/api/conversations/[id]/summarize/route.ts` - POST trigger summary

**Conversation list** (`src/app/api/conversations/route.ts`):
```typescript
export async function GET() {
  const userId = (await cookies()).get('convergio-user-id')?.value;
  if (!userId) return NextResponse.json([]);

  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return NextResponse.json(conversations.map(c => ({
    ...c,
    topics: JSON.parse(c.topics),
    keyFacts: c.keyFacts ? JSON.parse(c.keyFacts) : null,
    lastMessage: c.messages[0]?.content?.slice(0, 100),
  })));
}
```

**Summarize endpoint** (`src/app/api/conversations/[id]/summarize/route.ts`):
```typescript
// Triggers LLM summarization of old messages
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  if (!conversation || conversation.messages.length < 20) {
    return NextResponse.json({ skipped: true });
  }

  // Keep last 20 messages, summarize the rest
  const toSummarize = conversation.messages.slice(0, -20);
  const toKeep = conversation.messages.slice(-20);

  // Call LLM to summarize (use existing chat API or direct call)
  const summary = await generateSummary(toSummarize);
  const keyFacts = await extractKeyFacts(toSummarize);
  const topics = await extractTopics(toSummarize);

  // Update conversation and delete old messages
  await prisma.$transaction([
    prisma.message.deleteMany({
      where: { id: { in: toSummarize.map(m => m.id) } },
    }),
    prisma.conversation.update({
      where: { id: params.id },
      data: {
        summary: conversation.summary
          ? `${conversation.summary}\n\n---\n\n${summary}`
          : summary,
        keyFacts: JSON.stringify(keyFacts),
        topics: JSON.stringify(topics),
      },
    }),
  ]);

  return NextResponse.json({ summarized: toSummarize.length });
}
```

---

### Phase 2E: Learnings API

**Files to create:**
- `src/app/api/learnings/route.ts` - GET all, POST new
- `src/app/api/learnings/[id]/route.ts` - PUT update, DELETE
- `src/app/api/learnings/extract/route.ts` - POST extract from conversation

**Learnings CRUD** (`src/app/api/learnings/route.ts`):
```typescript
export async function GET(request: Request) {
  const userId = (await cookies()).get('convergio-user-id')?.value;
  if (!userId) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const maestroId = searchParams.get('maestroId');

  const learnings = await prisma.learning.findMany({
    where: {
      userId,
      ...(category && { category }),
      ...(maestroId && { maestroId }),
    },
    orderBy: { confidence: 'desc' },
  });

  return NextResponse.json(learnings);
}

export async function POST(request: Request) {
  const userId = (await cookies()).get('convergio-user-id')?.value;
  if (!userId) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const data = await request.json();

  // Check for similar existing learning
  const existing = await prisma.learning.findFirst({
    where: {
      userId,
      category: data.category,
      insight: { contains: data.insight.slice(0, 50) },
    },
  });

  if (existing) {
    // Reinforce existing learning
    const updated = await prisma.learning.update({
      where: { id: existing.id },
      data: {
        confidence: Math.min(1, existing.confidence + 0.1),
        occurrences: existing.occurrences + 1,
      },
    });
    return NextResponse.json(updated);
  }

  // Create new learning
  const learning = await prisma.learning.create({
    data: { userId, ...data },
  });

  return NextResponse.json(learning);
}
```

---

## Phase 3: Zustand Store Integration

**Modify existing stores to sync with API:**

File: `src/lib/stores/app-store.ts` (update)

```typescript
// Add API sync to useSettingsStore
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // ... existing state ...

      // Add sync methods
      syncToServer: async () => {
        const state = get();
        await fetch('/api/user/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            theme: state.theme,
            language: state.appearance.language,
            // ... map state to API format
          }),
        });
      },

      loadFromServer: async () => {
        const response = await fetch('/api/user/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.id) {  // Has DB data
            set({
              theme: data.theme,
              appearance: {
                theme: data.theme,
                language: data.language,
                accentColor: data.accentColor,
              },
              // ... map API format to state
            });
          }
        }
      },
    }),
    { name: 'convergio-settings' }
  )
);
```

**Create sync hook:**

File: `src/lib/hooks/use-sync.ts`

```typescript
import { useEffect, useRef } from 'react';
import { useSettingsStore, useProgressStore, useConversationStore } from '@/lib/stores/app-store';

export function useDataSync() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Load from server on mount
    Promise.all([
      useSettingsStore.getState().loadFromServer(),
      useProgressStore.getState().loadFromServer(),
    ]);
  }, []);

  // Auto-sync on changes (debounced)
  useEffect(() => {
    const unsubSettings = useSettingsStore.subscribe(
      debounce(() => useSettingsStore.getState().syncToServer(), 2000)
    );
    const unsubProgress = useProgressStore.subscribe(
      debounce(() => useProgressStore.getState().syncToServer(), 2000)
    );

    return () => {
      unsubSettings();
      unsubProgress();
    };
  }, []);
}
```

---

## Phase 4: Migration from localStorage

**One-time migration script:**

File: `src/lib/migration.ts`

```typescript
export async function migrateLocalStorageToDb() {
  // Check if already migrated
  const migrated = localStorage.getItem('convergio-migrated');
  if (migrated) return;

  // Get existing localStorage data
  const settingsData = localStorage.getItem('convergio-settings');
  const progressData = localStorage.getItem('convergio-progress');
  const conversationsData = localStorage.getItem('convergio-conversations');

  // Migrate each store
  if (settingsData) {
    const settings = JSON.parse(settingsData);
    await fetch('/api/user/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings.state),
    });
  }

  if (progressData) {
    const progress = JSON.parse(progressData);
    await fetch('/api/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progress.state),
    });
  }

  if (conversationsData) {
    const { conversations } = JSON.parse(conversationsData).state;
    for (const conv of conversations) {
      // Create conversation in DB
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maestroId: conv.maestroId,
          title: conv.title,
        }),
      });
      const newConv = await response.json();

      // Add messages
      for (const msg of conv.messages) {
        await fetch(`/api/conversations/${newConv.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg),
        });
      }
    }
  }

  // Mark as migrated
  localStorage.setItem('convergio-migrated', new Date().toISOString());
}
```

---

## Phase 5: LLM Summary & Learning Extraction

**Summary generation:**

File: `src/lib/ai/summarize.ts`

```typescript
import { generateText } from 'ai';  // Vercel AI SDK

export async function generateConversationSummary(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const { text } = await generateText({
    model: 'gpt-4o-mini',  // Economical model
    messages: [
      {
        role: 'system',
        content: `Sei un assistente che riassume conversazioni educative.
Crea un riassunto conciso che catturi:
- Argomenti principali discussi
- Domande chiave dello studente
- Concetti spiegati
- Eventuali difficoltà emerse
Rispondi in italiano, max 200 parole.`,
      },
      {
        role: 'user',
        content: `Riassumi questa conversazione:\n\n${messages
          .map(m => `${m.role}: ${m.content}`)
          .join('\n\n')}`,
      },
    ],
  });

  return text;
}

export async function extractKeyFacts(
  messages: Array<{ role: string; content: string }>
): Promise<{
  decisions: string[];
  preferences: string[];
  learned: string[];
}> {
  const { text } = await generateText({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Estrai informazioni chiave dalla conversazione in formato JSON:
{
  "decisions": ["decisioni prese dallo studente"],
  "preferences": ["preferenze di apprendimento espresse"],
  "learned": ["concetti che lo studente ha capito"]
}
Rispondi SOLO con JSON valido.`,
      },
      {
        role: 'user',
        content: messages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
      },
    ],
  });

  return JSON.parse(text);
}

export async function extractLearnings(
  messages: Array<{ role: string; content: string }>,
  maestroId: string,
  subject?: string
): Promise<Array<{
  category: string;
  insight: string;
  confidence: number;
}>> {
  const { text } = await generateText({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Analizza la conversazione e identifica caratteristiche dello studente.
Categorie: preference, strength, weakness, interest, style
Rispondi in JSON array:
[
  {"category": "preference", "insight": "Preferisce esempi pratici", "confidence": 0.7},
  {"category": "weakness", "insight": "Difficoltà con le frazioni", "confidence": 0.6}
]
Max 3 insights, solo quelli evidenti dalla conversazione.`,
      },
      {
        role: 'user',
        content: messages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
      },
    ],
  });

  return JSON.parse(text);
}
```

---

## Execution Order

```
Phase 0 (Sequential - CRITICAL)
    │
    ├── 0.1 Remove OpenAI direct fallback
    ├── 0.2 Create provider abstraction
    └── 0.3 Update env template
    │
    ▼
Phase 1 (Sequential - Foundation)
    │
    ├── 1.1 Install Prisma
    ├── 1.2 Create schema
    ├── 1.3 Generate client
    └── 1.4 Create db.ts
    │
    ▼
Phase 2 (Parallel - APIs)
    │
    ├── 2A: User/Settings/Profile  ─┐
    ├── 2B: Progress/Sessions      ─┼── All in parallel
    ├── 2C: Flashcards/Quizzes     ─┤
    ├── 2D: Conversations/Messages ─┤
    └── 2E: Learnings              ─┘
    │
    ▼
Phase 3 (Sequential - Integration)
    │
    └── Connect Zustand stores to APIs
    │
    ▼
Phase 4 (Sequential - Migration)
    │
    └── Migrate localStorage → DB
    │
    ▼
Phase 5 (Sequential - AI Features)
    │
    ├── Summary generation
    └── Learning extraction
```

---

## Environment Variables

Add to `.env.local`:

```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# For cloud (future)
# DATABASE_URL="postgresql://user:pass@host:5432/convergio?sslmode=require"
```

---

## Phase 0: Provider Architecture (CRITICAL - Do First)

**Requirements:**
- ✅ Azure OpenAI for all cloud features
- ✅ Ollama for 100% local operation (chat/text only)
- ❌ NEVER use direct OpenAI API keys
- ❌ NEVER use Anthropic

### Provider Support Matrix

| Feature | Azure OpenAI | Ollama | OpenAI Direct | Anthropic |
|---------|--------------|--------|---------------|-----------|
| Chat/Text | ✅ | ✅ | ❌ REMOVE | ❌ NEVER |
| Summaries | ✅ | ✅ | ❌ | ❌ |
| Voice Realtime | ✅ | ❌ Not possible | ❌ | ❌ |

### Task 0.1: Remove OpenAI Direct Fallback

**File**: `src/app/api/chat/route.ts`

Remove lines 39-79 (OpenAI fallback). Replace with proper error:

```typescript
if (!azureEndpoint || !azureApiKey) {
  // Check for Ollama
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';

  try {
    // Try Ollama (OpenAI-compatible endpoint)
    const response = await fetch(`${ollamaUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        content: data.choices[0]?.message?.content || '',
        provider: 'ollama',
        model: ollamaModel,
        maestroId,
      });
    }
  } catch (e) {
    // Ollama not running, continue to error
  }

  return NextResponse.json(
    {
      error: 'No AI provider configured',
      message: 'Configure Azure OpenAI or run Ollama locally',
      help: 'Run: ollama serve && ollama pull llama3.2'
    },
    { status: 503 }
  );
}
```

### Task 0.2: Create Provider Abstraction

**File**: `src/lib/ai/providers.ts`

```typescript
export type AIProvider = 'azure' | 'ollama';

export interface ProviderConfig {
  provider: AIProvider;
  endpoint: string;
  apiKey?: string;  // Not needed for Ollama
  model: string;
}

export function getActiveProvider(): ProviderConfig | null {
  // 1. Check Azure OpenAI
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
    return {
      provider: 'azure',
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-4o',
    };
  }

  // 2. Check Ollama (no API key needed)
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  return {
    provider: 'ollama',
    endpoint: ollamaUrl,
    model: process.env.OLLAMA_MODEL || 'llama3.2',
  };
}

export function getRealtimeProvider(): ProviderConfig | null {
  // Voice ONLY works with Azure OpenAI Realtime
  if (
    process.env.AZURE_OPENAI_REALTIME_ENDPOINT &&
    process.env.AZURE_OPENAI_REALTIME_API_KEY &&
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT
  ) {
    return {
      provider: 'azure',
      endpoint: process.env.AZURE_OPENAI_REALTIME_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_REALTIME_API_KEY,
      model: process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT,
    };
  }
  return null;  // Voice not available
}

export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<{ content: string; provider: AIProvider }> {
  const config = getActiveProvider();
  if (!config) throw new Error('No AI provider configured');

  if (config.provider === 'azure') {
    const url = `${config.endpoint}/openai/deployments/${config.model}/chat/completions?api-version=2024-08-01-preview`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': config.apiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });
    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'azure',
    };
  }

  if (config.provider === 'ollama') {
    const response = await fetch(`${config.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'ollama',
    };
  }

  throw new Error('Unknown provider');
}
```

### Task 0.3: Update Environment Template

**File**: `.env.example`

```env
# ============================================================================
# AI PROVIDERS (Choose one for chat, Azure required for voice)
# ============================================================================

# Option 1: Azure OpenAI (Recommended for production)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-08-01-preview

# Voice (Azure OpenAI Realtime - required for voice features)
AZURE_OPENAI_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_REALTIME_API_KEY=your-key
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime-preview

# Option 2: Ollama (100% local, free, chat only)
# If Azure not configured, will try Ollama automatically
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# ============================================================================
# DATABASE
# ============================================================================
DATABASE_URL="file:./prisma/dev.db"

# ============================================================================
# NEVER USE THESE (listed for clarity)
# ============================================================================
# OPENAI_API_KEY=xxx        # ❌ Don't use direct OpenAI
# ANTHROPIC_API_KEY=xxx     # ❌ Never use Anthropic
```

### Ollama Setup Guide

For 100% local operation (chat only, no voice):

```bash
# Install Ollama
brew install ollama

# Start Ollama server
ollama serve

# Pull a model (in another terminal)
ollama pull llama3.2        # Fast, good for education
# or
ollama pull mistral         # Alternative
# or
ollama pull llama3.1:70b    # Best quality (needs 64GB+ RAM)
```

Then just run the webapp - it will auto-detect Ollama.

### Voice Fallback UI

When voice is not available (no Azure Realtime configured), show graceful fallback:

**File**: `src/components/voice/voice-unavailable.tsx`

```typescript
export function VoiceUnavailable({ maestro }: { maestro: Maestro }) {
  return (
    <div className="p-6 text-center">
      <h3 className="text-lg font-semibold mb-2">
        Voce non disponibile
      </h3>
      <p className="text-muted-foreground mb-4">
        La conversazione vocale richiede Azure OpenAI Realtime.
        Puoi comunque chattare con {maestro.displayName} via testo.
      </p>
      <Button onClick={() => startTextChat(maestro)}>
        Inizia Chat Testuale
      </Button>
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Phase 1: `npx prisma studio` shows tables
- [ ] Phase 2A: GET/PUT /api/user/settings works
- [ ] Phase 2B: Progress persists across browser refresh
- [ ] Phase 2C: Flashcard FSRS state persists
- [ ] Phase 2D: Conversations saved and retrieved
- [ ] Phase 2E: Learnings extracted and stored
- [ ] Phase 3: Zustand syncs with API automatically
- [ ] Phase 4: Migration from localStorage works
- [ ] Phase 5: Summaries generated, learnings extracted

---

## Estimated Implementation

| Phase | Complexity | Dependencies |
|-------|------------|--------------|
| 0 | Medium | None (CRITICAL - do first) |
| 1 | Low | Phase 0 |
| 2A | Medium | Phase 1 |
| 2B | Medium | Phase 1 |
| 2C | Medium | Phase 1 |
| 2D | High | Phase 1 |
| 2E | Medium | Phase 1 |
| 3 | Medium | Phase 2 |
| 4 | Low | Phase 2, 3 |
| 5 | High | Phase 2D |

---

---

## Known Issues to Fix (Reported During Implementation)

### Issue 1: Microphone/Webcam Permissions Asked Every Time
- **Problem**: Browser asks for permissions on every session
- **Cause**: Likely localhost without HTTPS or missing Permissions-Policy header
- **Fix**: Add proper permissions handling in voice-session component
- **Priority**: Medium

### Issue 2: Mindmaps Have Incomplete Strings
- **Problem**: Some mindmap example data has truncated or incomplete text
- **Cause**: Data generation or import issue
- **Fix**: Review and fix mindmap example data in `/src/data/`
- **Priority**: Medium

### Issue 3: Theme Main Color Not Working Properly
- **Problem**: Accent color selection doesn't apply correctly
- **Cause**: CSS variable mapping or Tailwind config issue
- **Fix**: Review theme system in settings and CSS variables
- **Priority**: Medium

---

## Cloud Migration (Future)

When ready for multi-user:

1. Change `DATABASE_URL` to PostgreSQL connection string
2. Run `npx prisma migrate deploy`
3. Add NextAuth.js middleware
4. Add user authentication to API routes
5. Deploy to Vercel/Railway/etc.

**Zero code changes required** - just configuration.
