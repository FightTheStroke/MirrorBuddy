# LocalStorageMigrationPlanDec31 - Database as Single Source of Truth

**Data**: 2025-12-31
**Target**: Migrate all 13 Zustand stores + 9 direct localStorage usages to SQLite/PostgreSQL
**Issue**: #64
**Metodo**: VERIFICA BRUTALE - ogni task testato prima di dichiararlo fatto

---

## 🎭 RUOLI CLAUDE

| Claude | Ruolo | Workstream | Branch |
|--------|-------|------------|--------|
| **CLAUDE 1** | COORDINATORE | Monitora, verifica, merge | `main` |
| **CLAUDE 2** | IMPLEMENTER | Schema + User/Settings APIs + Stores | `feature/64-phase1-schema-user` |
| **CLAUDE 3** | IMPLEMENTER | Progress/Conversations APIs + Stores | `feature/64-phase1-progress-conv` |
| **CLAUDE 4** | IMPLEMENTER | Materials/Components + Migration | `feature/64-phase1-materials` |

> **MAX 4 CLAUDE** - Oltre diventa ingestibile e aumenta rischio conflitti git

---

## 🚦 PHASE GATES

| Gate | Blocking Phase | Waiting Phases | Status | Unlocked By |
|------|----------------|----------------|--------|-------------|
| GATE-0 | Phase 0 (Schema) | Phase 1A, 1B, 1C | 🔴 LOCKED | CLAUDE 2 |
| GATE-1 | Phase 1 (APIs) | Phase 2 (Stores) | 🔴 LOCKED | CLAUDE 1 |
| GATE-2 | Phase 2 (Stores) | Phase 3 (Components) | 🔴 LOCKED | CLAUDE 1 |
| GATE-3 | Phase 3 (Components) | Phase 4 (Migration) | 🔴 LOCKED | CLAUDE 1 |

---

## ⚠️ REGOLE OBBLIGATORIE PER TUTTI I CLAUDE

```
1. PRIMA di iniziare: leggi TUTTO questo file
2. Trova i task assegnati a te (cerca "CLAUDE X" dove X è il tuo numero)
3. Per OGNI task:
   a. Leggi i file indicati
   b. Implementa la soluzione
   c. Esegui TUTTI i comandi di verifica
   d. Solo se TUTTI passano, aggiorna questo file marcando ✅ DONE

4. VERIFICA OBBLIGATORIA dopo ogni task:
   npm run lint        # DEVE essere 0 errors, 0 warnings
   npm run typecheck   # DEVE compilare senza errori
   npm run build       # DEVE buildare senza errori

5. NON DIRE MAI "FATTO" SE:
   - Non hai eseguito i 3 comandi sopra
   - Anche UN SOLO warning appare
   - Non hai aggiornato questo file

6. Se trovi problemi/blocchi: CHIEDI invece di inventare soluzioni

7. Dopo aver completato: aggiorna la sezione EXECUTION TRACKER con ✅

8. CONFLITTI GIT: Se ci sono conflitti, risolvi mantenendo ENTRAMBE le modifiche
```

---

## 📊 DEPENDENCY GRAPH

```
                    ┌─────────────────┐
                    │   PHASE 0       │
                    │ Schema Prisma   │
                    │   (CLAUDE 2)    │
                    └────────┬────────┘
                             │ GATE-0
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
   │  PHASE 1A     │ │  PHASE 1B     │ │  PHASE 1C     │
   │ User/Settings │ │ Progress/Conv │ │ Materials     │
   │  (CLAUDE 2)   │ │  (CLAUDE 3)   │ │  (CLAUDE 4)   │
   └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │ GATE-1
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
   │  PHASE 2A     │ │  PHASE 2B     │ │  PHASE 2C     │
   │ Settings/Acc  │ │ Progress/Conv │ │ Other Stores  │
   │   Stores      │ │   Stores      │ │               │
   │  (CLAUDE 2)   │ │  (CLAUDE 3)   │ │  (CLAUDE 4)   │
   └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │ GATE-2
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
   │  PHASE 3A     │ │  PHASE 3B     │ │  PHASE 3C     │
   │ Education     │ │ Settings UI   │ │ Other Comps   │
   │ Components    │ │               │ │               │
   │  (CLAUDE 4)   │ │  (CLAUDE 2)   │ │  (CLAUDE 3)   │
   └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │ GATE-3
                    ┌────────▼────────┐
                    │   PHASE 4       │
                    │ Migration &     │
                    │ Cleanup         │
                    │  (CLAUDE 4)     │
                    └─────────────────┘
```

---

## 🎯 EXECUTION TRACKER

### Phase 0: Schema Prisma — 0/5 ⏳ BLOCKING

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ⬜ | T-001 | Add AccessibilitySettings model | **CLAUDE 2** | `prisma/schema.prisma` | |
| ⬜ | T-002 | Add OnboardingState model | **CLAUDE 2** | `prisma/schema.prisma` | |
| ⬜ | T-003 | Add PomodoroStats model | **CLAUDE 2** | `prisma/schema.prisma` | |
| ⬜ | T-004 | Add HomeworkSession + HtmlSnippet models | **CLAUDE 2** | `prisma/schema.prisma` | |
| ⬜ | T-005 | Update User + Settings models, run migration | **CLAUDE 2** | `prisma/schema.prisma` | UNLOCK GATE-0 |

### Phase 1A: User/Settings/Accessibility APIs — 0/4 ⏸️ WAITING GATE-0

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ⬜ | T-101 | Create /api/accessibility route (GET/PATCH) | **CLAUDE 2** | `src/app/api/accessibility/route.ts` | |
| ⬜ | T-102 | Create /api/onboarding route (GET/PATCH) | **CLAUDE 2** | `src/app/api/onboarding/route.ts` | |
| ⬜ | T-103 | Create /api/pomodoro route (GET/PATCH) | **CLAUDE 2** | `src/app/api/pomodoro/route.ts` | |
| ⬜ | T-104 | Update /api/settings to include azure cost fields | **CLAUDE 2** | `src/app/api/settings/route.ts` | |

### Phase 1B: Progress/Conversations APIs — 0/4 ⏸️ WAITING GATE-0

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ⬜ | T-111 | Update /api/progress to sync all fields | **CLAUDE 3** | `src/app/api/progress/route.ts` | |
| ⬜ | T-112 | Update /api/conversations to handle flow messages | **CLAUDE 3** | `src/app/api/conversations/route.ts` | |
| ⬜ | T-113 | Create /api/learnings route (GET/POST/DELETE) | **CLAUDE 3** | `src/app/api/learnings/route.ts` | |
| ⬜ | T-114 | Create /api/calendar route (GET/POST/PATCH/DELETE) | **CLAUDE 3** | `src/app/api/calendar/route.ts` | |

### Phase 1C: Materials/Tools APIs — 0/4 ⏸️ WAITING GATE-0

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ⬜ | T-121 | Create /api/materials/mindmaps route | **CLAUDE 4** | `src/app/api/materials/mindmaps/route.ts` | |
| ⬜ | T-122 | Create /api/materials/flashcards route | **CLAUDE 4** | `src/app/api/materials/flashcards/route.ts` | |
| ⬜ | T-123 | Create /api/materials/quizzes route | **CLAUDE 4** | `src/app/api/materials/quizzes/route.ts` | |
| ⬜ | T-124 | Create /api/homework route (GET/POST/PATCH) | **CLAUDE 4** | `src/app/api/homework/route.ts` | UNLOCK GATE-1 (with others) |

### Phase 2A: Settings/Accessibility Stores — 0/3 ⏸️ WAITING GATE-1

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ⬜ | T-201 | Refactor SettingsStore: remove persist, add API sync | **CLAUDE 2** | `src/lib/stores/app-store.ts` | Lines 114-287 |
| ⬜ | T-202 | Refactor AccessibilityStore: remove persist, add API sync | **CLAUDE 2** | `src/lib/accessibility/accessibility-store.ts` | |
| ⬜ | T-203 | Refactor OnboardingStore: remove persist, add API sync | **CLAUDE 2** | `src/lib/stores/onboarding-store.ts` | |

### Phase 2B: Progress/Conversation Stores — 0/4 ⏸️ WAITING GATE-1

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ⬜ | T-211 | Refactor ProgressStore: remove persist, add API sync | **CLAUDE 3** | `src/lib/stores/app-store.ts` | Lines 349-637 |
| ⬜ | T-212 | Refactor ConversationStore: remove persist, add API sync | **CLAUDE 3** | `src/lib/stores/app-store.ts` | Lines 737-887 |
| ⬜ | T-213 | Refactor ConversationFlowStore: remove persist, add API sync | **CLAUDE 3** | `src/lib/stores/conversation-flow-store.ts` | |
| ⬜ | T-214 | Refactor LearningsStore: remove persist, add API sync | **CLAUDE 3** | `src/lib/stores/app-store.ts` | Lines 917-996 |

### Phase 2C: Other Stores — 0/5 ⏸️ WAITING GATE-1

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ⬜ | T-221 | Refactor NotificationStore: remove persist, add API sync | **CLAUDE 4** | `src/lib/stores/notification-store.ts` | |
| ⬜ | T-222 | Refactor PomodoroStore: remove persist, add API sync | **CLAUDE 4** | `src/lib/stores/pomodoro-store.ts` | |
| ⬜ | T-223 | Refactor MethodProgressStore: remove persist, add API sync | **CLAUDE 4** | `src/lib/stores/method-progress-store.ts` | |
| ⬜ | T-224 | Refactor CalendarStore: remove persist, add API sync | **CLAUDE 4** | `src/lib/stores/app-store.ts` | Lines 1134-1246 |
| ⬜ | T-225 | Refactor HTMLSnippetsStore: remove persist, add API sync | **CLAUDE 4** | `src/lib/stores/app-store.ts` | Lines 1025-1068, UNLOCK GATE-2 |

### Phase 3A: Education Components — 0/4 ⏸️ WAITING GATE-2

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ⬜ | T-301 | Update mindmaps-view.tsx: use API instead of localStorage | **CLAUDE 4** | `src/components/education/mindmaps-view.tsx` | |
| ⬜ | T-302 | Update flashcards-view.tsx: use API instead of localStorage | **CLAUDE 4** | `src/components/education/flashcards-view.tsx` | |
| ⬜ | T-303 | Update tool-result-display.tsx: use API for saving | **CLAUDE 4** | `src/components/tools/tool-result-display.tsx` | |
| ⬜ | T-304 | Update homework-help-view.tsx: use API | **CLAUDE 4** | `src/components/education/homework-help-view.tsx` | |

### Phase 3B: Settings/UI Components — 0/3 ⏸️ WAITING GATE-2

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ⬜ | T-311 | Update settings-view.tsx: remove azure_cost_config localStorage | **CLAUDE 2** | `src/components/settings/settings-view.tsx` | |
| ⬜ | T-312 | Update settings-view.tsx: update reset data function | **CLAUDE 2** | `src/components/settings/settings-view.tsx` | Lines 1496-1506 |
| ⬜ | T-313 | Add hydration provider component | **CLAUDE 2** | `src/components/providers/data-provider.tsx` | NEW FILE |

### Phase 3C: Other Components — 0/3 ⏸️ WAITING GATE-2

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ⬜ | T-321 | Update mastery.ts: use Progress.masteries from API | **CLAUDE 3** | `src/lib/education/mastery.ts` | |
| ⬜ | T-322 | Update use-parent-insights-indicator.ts: use User field | **CLAUDE 3** | `src/lib/hooks/use-parent-insights-indicator.ts` | |
| ⬜ | T-323 | Update materials-db.ts: get userId from cookie/session | **CLAUDE 3** | `src/lib/storage/materials-db.ts` | UNLOCK GATE-3 |

### Phase 4: Migration & Cleanup — 0/5 ⏸️ WAITING GATE-3

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ⬜ | T-401 | Create migration utility function | **CLAUDE 4** | `src/lib/migration/localStorage-to-db.ts` | NEW FILE |
| ⬜ | T-402 | Create one-time migration hook | **CLAUDE 4** | `src/lib/hooks/use-data-migration.ts` | NEW FILE |
| ⬜ | T-403 | Integrate migration in app layout | **CLAUDE 4** | `src/app/layout.tsx` | |
| ⬜ | T-404 | Update GDPR export to use only DB | **CLAUDE 4** | `src/app/api/user/data/route.ts` | |
| ⬜ | T-405 | Final cleanup: remove all persist() imports | **CLAUDE 4** | Multiple files | |

### Phase 5: Testing & Documentation — 0/4

| Status | ID | Task | Assignee | Files | Note |
|:------:|-----|------|----------|-------|------|
| ⬜ | T-501 | Test complete data flow | **CLAUDE 1** | N/A | Manual testing |
| ⬜ | T-502 | Test reset functionality | **CLAUDE 1** | N/A | Manual testing |
| ⬜ | T-503 | Test GDPR export/delete | **CLAUDE 1** | N/A | Manual testing |
| ⬜ | T-504 | Update CLAUDE.md with new architecture | **CLAUDE 1** | `CLAUDE.md` | |

---

## 📋 TASK DETTAGLIATI PER CLAUDE

## CLAUDE 1: COORDINATORE

### Responsabilit
1. **Setup Worktrees**: Prima di tutto, crea i worktree per gli altri Claude
2. **Monitoraggio Piano**: Controlla periodicamente questo file per aggiornamenti
3. **Unlock Gates**: Quando tutte le task di una fase sono ✅, sblocca il gate
4. **Verifica Coerenza**: Assicurati che lint/typecheck/build passino sempre
5. **Merge PRs**: Quando ogni fase completa, merge la PR relativa
6. **Testing Finale**: Phase 5 testing manuale

### Setup Iniziale (FARE PRIMA DI TUTTO)
```bash
cd /Users/roberdan/GitHub/ConvergioEdu

# Crea branch per ogni Claude
git checkout main
git pull origin main
git branch feature/64-phase1-schema-user
git branch feature/64-phase1-progress-conv
git branch feature/64-phase1-materials

# Crea worktrees
git worktree add ../ConvergioEdu-C2 feature/64-phase1-schema-user
git worktree add ../ConvergioEdu-C3 feature/64-phase1-progress-conv
git worktree add ../ConvergioEdu-C4 feature/64-phase1-materials

# Verifica
git worktree list
```

### Comandi di Monitoraggio
```bash
# Verifica build
npm run lint && npm run typecheck && npm run build

# Check status
git status
cat docs/plans/LocalStorageMigrationPlanDec31.md | grep -E "^\\| (✅|⬜|🔄)"
```

### Gate Unlock Protocol
Quando una fase completa (tutti ✅):
1. Aggiorna il gate status in questo file: 🔴 LOCKED → 🟢 UNLOCKED
2. Notifica i Claude in attesa:
```bash
# Per Kitty
kitty @ send-text --match title:Claude-3 "🟢 GATE-X UNLOCKED! Procedi con i tuoi task." && kitty @ send-key --match title:Claude-3 Return

# Per tmux
tmux send-keys -t claude-workers:Claude-3 "🟢 GATE-X UNLOCKED! Procedi con i tuoi task." Enter
```

---

## CLAUDE 2: Schema + User/Settings Domain

### Worktree
```bash
cd ../ConvergioEdu-C2
# Branch: feature/64-phase1-schema-user
```

### Task: T-001 - Add AccessibilitySettings model

#### Obiettivo
Aggiungere il modello AccessibilitySettings allo schema Prisma

#### File da leggere PRIMA
```bash
cat prisma/schema.prisma
cat src/lib/accessibility/accessibility-store.ts
```

#### Azioni richieste
1. Leggi `accessibility-store.ts` per capire tutti i campi necessari
2. Aggiungi il modello AccessibilitySettings a schema.prisma:

```prisma
model AccessibilitySettings {
  id              String  @id @default(cuid())
  userId          String  @unique
  user            User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Visual
  fontSize        String  @default("medium")
  fontFamily      String  @default("system")
  lineHeight      Float   @default(1.5)
  letterSpacing   Float   @default(0)
  wordSpacing     Float   @default(0)

  // Contrast & Colors
  highContrast    Boolean @default(false)
  colorBlindMode  String?

  // Motion & Animation
  reducedMotion   Boolean @default(false)

  // Audio
  screenReader    Boolean @default(false)
  ttsEnabled      Boolean @default(false)
  ttsSpeed        Float   @default(1.0)

  // Focus & Navigation
  focusIndicators Boolean @default(true)
  keyboardNav     Boolean @default(true)

  // ADHD Support
  adhdMode        Boolean @default(false)
  breakReminders  Boolean @default(true)
  focusMode       Boolean @default(false)

  // Dyslexia Support
  dyslexiaFont    Boolean @default(false)
  syllableHighlight Boolean @default(false)

  // Presets
  activePreset    String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

3. Aggiungi relazione in User model:
```prisma
model User {
  // ... existing ...
  accessibility   AccessibilitySettings?
}
```

#### Verifica
```bash
npx prisma validate
npm run typecheck
```

---

### Task: T-002 - Add OnboardingState model

#### Obiettivo
Aggiungere il modello OnboardingState allo schema Prisma

#### File da leggere PRIMA
```bash
cat src/lib/stores/onboarding-store.ts
```

#### Azioni richieste
Aggiungi a schema.prisma:

```prisma
model OnboardingState {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  currentStep     Int      @default(0)
  completedSteps  String   @default("[]")
  isCompleted     Boolean  @default(false)
  completedAt     DateTime?

  selectedMaestri String   @default("[]")
  voiceTestDone   Boolean  @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

Aggiungi relazione in User:
```prisma
  onboardingState OnboardingState?
```

---

### Task: T-003 - Add PomodoroStats model

#### File da leggere PRIMA
```bash
cat src/lib/stores/pomodoro-store.ts
```

#### Azioni richieste
```prisma
model PomodoroStats {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  totalPomodoros      Int      @default(0)
  totalFocusMinutes   Int      @default(0)
  totalBreakMinutes   Int      @default(0)
  longestStreak       Int      @default(0)

  todayPomodoros      Int      @default(0)
  todayFocusMinutes   Int      @default(0)
  lastPomodoroDate    String?

  currentPhase        String   @default("idle")
  pomodorosInCycle    Int      @default(0)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

---

### Task: T-004 - Add HomeworkSession + HtmlSnippet models

#### Azioni richieste
```prisma
model HomeworkSession {
  id              String   @id @default(cuid())
  userId          String

  subject         String
  topic           String?
  imageUrl        String?
  ocrText         String?
  messages        String   @default("[]")
  status          String   @default("active")

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
  @@index([status])
}

model HtmlSnippet {
  id              String   @id @default(cuid())
  userId          String

  html            String
  title           String?
  description     String?
  subject         String?
  maestroId       String?

  createdAt       DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
}
```

---

### Task: T-005 - Update User + Settings, run migration

#### Azioni richieste
1. Aggiungi a User:
```prisma
  pomodoroStats     PomodoroStats?
  homeworkSessions  HomeworkSession[]
  htmlSnippets      HtmlSnippet[]
  parentInsightsLastViewed DateTime?
```

2. Aggiungi a Settings:
```prisma
  azureCostPerToken   Float   @default(0.00001)
  azureTotalTokens    Int     @default(0)
```

3. Genera e applica migration:
```bash
npx prisma generate
npx prisma db push
```

#### Verifica FINALE Phase 0
```bash
npm run lint && npm run typecheck && npm run build
```

4. **UNLOCK GATE-0**: Aggiorna questo file e notifica altri Claude

---

### Task: T-101/102/103/104 - API Routes (Phase 1A)

#### T-101: /api/accessibility
Crea `src/app/api/accessibility/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('convergio-user-id')?.value;
  if (!userId) return NextResponse.json({ error: 'No user' }, { status: 401 });

  let settings = await prisma.accessibilitySettings.findUnique({ where: { userId } });
  if (!settings) {
    settings = await prisma.accessibilitySettings.create({ data: { userId } });
  }
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('convergio-user-id')?.value;
  if (!userId) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const data = await request.json();
  const settings = await prisma.accessibilitySettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
  return NextResponse.json(settings);
}
```

#### T-102, T-103, T-104
Stesso pattern per onboarding, pomodoro, settings.

---

### Task: T-201/202/203 - Store Refactoring (Phase 2A)

#### Pattern di refactoring per ogni store:

1. **Rimuovi** `persist()` wrapper
2. **Aggiungi** `loadFromServer()` che chiama GET API
3. **Aggiungi** sync in ogni action che modifica stato
4. **Aggiungi** debounce per evitare troppe chiamate

Esempio per AccessibilityStore:
```typescript
// BEFORE
export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({ ... }),
    { name: 'convergio-accessibility' }
  )
);

// AFTER
export const useAccessibilityStore = create<AccessibilityState>()(
  (set, get) => ({
    // ... state ...

    loadFromServer: async () => {
      const res = await fetch('/api/accessibility');
      if (res.ok) {
        const data = await res.json();
        set(data);
      }
    },

    setFontSize: (fontSize) => {
      set({ fontSize });
      // Debounced sync
      debouncedSync(get());
    },

    // ... other actions with sync ...
  })
);

const debouncedSync = debounce(async (state) => {
  await fetch('/api/accessibility', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
}, 500);
```

---

## CLAUDE 3: Progress/Conversations Domain

### Worktree
```bash
cd ../ConvergioEdu-C3
# Branch: feature/64-phase1-progress-conv
```

### Task: T-111 - Update /api/progress

#### File da leggere PRIMA
```bash
cat src/app/api/progress/route.ts
cat src/lib/stores/app-store.ts | head -700 | tail -400
```

#### Azioni richieste
Assicurati che l'API synci tutti i campi del ProgressStore:
- xp, level, streak*, achievements, masteries, totalStudyMinutes, questionsAsked, sessionsThisWeek

---

### Task: T-112 - Update /api/conversations for flow messages

#### Obiettivo
Le conversazioni del ConversationFlowStore devono essere salvate in DB

#### Azioni richieste
1. Aggiungi campo `characterType` a Conversation model se non presente
2. Modifica POST per accettare characterId e characterType
3. Assicurati che tutti i messaggi siano salvati

---

### Task: T-113 - Create /api/learnings

```typescript
// GET: lista learnings per user
// POST: crea nuovo learning
// DELETE: cancella learning
```

---

### Task: T-114 - Create /api/calendar

Usa il modello ScheduledSession esistente.

---

### Task: T-211/212/213/214 - Store Refactoring (Phase 2B)

Applica lo stesso pattern di refactoring (vedi CLAUDE 2 examples).

---

### Task: T-321/322/323 - Component Updates (Phase 3C)

#### T-321: mastery.ts
Rimuovi localStorage, usa l'API /api/progress per salvare masteries.

#### T-322: use-parent-insights-indicator.ts
Usa User.parentInsightsLastViewed da API invece di localStorage.

#### T-323: materials-db.ts
Ottieni userId dal cookie invece di localStorage.

---

## CLAUDE 4: Materials/Components/Migration Domain

### Worktree
```bash
cd ../ConvergioEdu-C4
# Branch: feature/64-phase1-materials
```

### Task: T-121/122/123/124 - Materials APIs (Phase 1C)

Crea API routes per mindmaps, flashcards, quizzes, homework.
Usa il modello Material esistente con filtro per toolType.

Esempio per mindmaps:
```typescript
// src/app/api/materials/mindmaps/route.ts
export async function GET() {
  const userId = getUserId();
  const mindmaps = await prisma.material.findMany({
    where: { userId, toolType: 'mindmap', status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(mindmaps);
}

export async function POST(request: NextRequest) {
  const userId = getUserId();
  const data = await request.json();
  const material = await prisma.material.create({
    data: {
      userId,
      toolType: 'mindmap',
      toolId: data.id || crypto.randomUUID(),
      title: data.title || 'Untitled Mindmap',
      content: JSON.stringify(data),
    },
  });
  return NextResponse.json(material);
}
```

---

### Task: T-221/222/223/224/225 - Store Refactoring (Phase 2C)

Applica lo stesso pattern di refactoring per:
- NotificationStore
- PomodoroStore
- MethodProgressStore
- CalendarStore
- HTMLSnippetsStore

---

### Task: T-301/302/303/304 - Education Components (Phase 3A)

#### T-301: mindmaps-view.tsx
```typescript
// BEFORE
const saved = localStorage.getItem('convergio-mindmaps');

// AFTER
const { data: mindmaps } = useSWR('/api/materials/mindmaps', fetcher);
```

Stesso pattern per flashcards, quizzes, homework.

---

### Task: T-401/402/403/404/405 - Migration & Cleanup (Phase 4)

#### T-401: Migration utility
```typescript
// src/lib/migration/localStorage-to-db.ts
export async function migrateLocalStorageToDb() {
  const keys = [
    'convergio-settings',
    'convergio-progress',
    'convergio-accessibility',
    // ... all keys
  ];

  for (const key of keys) {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        await syncToApi(key, parsed);
        localStorage.removeItem(key);
      } catch (e) {
        console.error(`Migration failed for ${key}`, e);
      }
    }
  }
}
```

#### T-402: Migration hook
```typescript
// src/lib/hooks/use-data-migration.ts
export function useDataMigration() {
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    const migrationDone = localStorage.getItem('migration-v1-done');
    if (!migrationDone) {
      migrateLocalStorageToDb().then(() => {
        localStorage.setItem('migration-v1-done', 'true');
        setMigrated(true);
      });
    } else {
      setMigrated(true);
    }
  }, []);

  return migrated;
}
```

#### T-403: Integrate in layout
Aggiungi DataProvider che chiama migration e hydration.

#### T-404: Update GDPR export
Rimuovi logica localStorage, usa solo query DB.

#### T-405: Final cleanup
Rimuovi tutti gli import di `persist` da zustand/middleware.

---

## 📊 PROGRESS SUMMARY

| Phase | Done | Total | Status | Assignee |
|-------|:----:|:-----:|--------|----------|
| Phase 0 (Schema) | 0 | 5 | ⬜ | CLAUDE 2 |
| Phase 1A (User APIs) | 0 | 4 | ⬜ | CLAUDE 2 |
| Phase 1B (Progress APIs) | 0 | 4 | ⬜ | CLAUDE 3 |
| Phase 1C (Materials APIs) | 0 | 4 | ⬜ | CLAUDE 4 |
| Phase 2A (Settings Stores) | 0 | 3 | ⬜ | CLAUDE 2 |
| Phase 2B (Progress Stores) | 0 | 4 | ⬜ | CLAUDE 3 |
| Phase 2C (Other Stores) | 0 | 5 | ⬜ | CLAUDE 4 |
| Phase 3A (Education Comps) | 0 | 4 | ⬜ | CLAUDE 4 |
| Phase 3B (Settings UI) | 0 | 3 | ⬜ | CLAUDE 2 |
| Phase 3C (Other Comps) | 0 | 3 | ⬜ | CLAUDE 3 |
| Phase 4 (Migration) | 0 | 5 | ⬜ | CLAUDE 4 |
| Phase 5 (Testing) | 0 | 4 | ⬜ | CLAUDE 1 |
| **TOTAL** | **0** | **48** | **0%** | |

---

## VERIFICATION CHECKLIST (Prima del merge finale)

```bash
# Ogni Claude deve verificare nel proprio worktree
npm run lint        # 0 errors, 0 warnings
npm run typecheck   # no errors
npm run build       # success

# Test funzionali (CLAUDE 1)
npm run dev
# Test: login → check data loads → make changes → refresh → verify persisted
# Test: reset data → verify all cleared
# Test: GDPR export → verify complete data
```

---

## PR WORKFLOW

Ogni Claude, quando completa tutti i suoi task di una fase:

```bash
git add .
git commit -m "feat(database): Phase X - [description]

Part of #64: Consolidate localStorage to Database

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

git push -u origin feature/64-phaseX-[domain]

gh pr create --title "feat(database): Phase X - [description]" \
  --body "## Summary
- [bullet points of what was done]

## Part of #64

## Verification
- [x] npm run lint ✅
- [x] npm run typecheck ✅
- [x] npm run build ✅

🤖 Generated with Claude Code" \
  --base main
```

---

**Versione**: 1.0
**Creato**: 2025-12-31
**Ultimo aggiornamento**: 2025-12-31
