# Piano: Sistema Riassunti Conversazioni + Archivio Unificato

**Data**: 2026-01-01
**Branch**: `feature/conversation-summaries-unified-archive`
**Status**: Complete

---

## Obiettivi

1. **Riassunti Conversazioni** - Generare riassunto a fine sessione (chiusura + timeout 15min)
2. **Saluto Contestuale** - All'avvio, caricare ultimo riassunto e salutare contestualmente
3. **Archivio Unificato** - Consolidare `Material` + `CreatedTool` in una sola tabella
4. **Voto Sessioni** - Auto-valutazione studente + valutazione AI maestro
5. **Diario Sessioni** - Tracciare argomenti, tool usati (con link), durata
6. **Note Genitori** - Generare SEMPRE una nota dopo ogni sessione

---

## Checkpoints

| Fase | Status |
|------|--------|
| Setup worktree | ✅ |
| Schema Prisma | ✅ |
| Migrazione CreatedTool → Material | ✅ |
| Sistema Riassunti | ✅ |
| Saluto Contestuale | ✅ |
| Sistema Valutazioni | ✅ |
| Note Genitori | ✅ |
| Frontend Integration | ✅ |
| Documentazione (ADR, Docs, Changelog) | ✅ |
| Test & Cleanup | ✅ |

---

## Fase 1: Schema Prisma

### 1.1 Modifiche a `StudySession`

```prisma
model StudySession {
  // ... existing fields ...

  // NEW: Ratings
  studentRating    Int?      // 1-5 auto-valutazione
  studentFeedback  String?   // Commento opzionale studente
  maestroScore     Int?      // 1-10 valutazione AI
  maestroFeedback  String?   // Feedback AI
  strengths        String?   // JSON array
  areasToImprove   String?   // JSON array

  // NEW: Topics & Context
  topics           String    @default("[]") // JSON array argomenti
  conversationId   String?   // Link a Conversation

  // NEW: Tools relation
  materials        Material[]
}
```

### 1.2 Modifiche a `Material`

```prisma
model Material {
  // ... existing fields ...

  // NEW: Session relation
  sessionId   String?
  session     StudySession? @relation(fields: [sessionId], references: [id])

  // NEW: From CreatedTool migration
  topic          String?
  conversationId String?

  @@index([sessionId])
}
```

### 1.3 Nuovo modello `ParentNote`

```prisma
model ParentNote {
  id          String    @id @default(cuid())
  userId      String
  sessionId   String
  maestroId   String
  subject     String
  duration    Int

  summary     String    // Riassunto per genitori
  highlights  String    // JSON array achievements
  concerns    String?   // JSON array (può essere vuoto)
  suggestions String?   // JSON array consigli

  generatedAt DateTime  @default(now())
  viewedAt    DateTime?

  @@index([userId])
  @@index([sessionId])
}
```

**File**: `prisma/schema.prisma`

---

## Fase 2: Migrazione CreatedTool → Material

### 2.1 Script migrazione

**File**: `scripts/migrate-created-tools.ts`

- [x] Leggere tutti i CreatedTool
- [x] Per ognuno, creare Material con toolId = `migrated-${createdTool.id}`
- [x] Verificare migrazione
- [x] NON cancellare CreatedTool (buffer 30 giorni)

### 2.2 API Updates

- [x] `src/lib/tools/tool-persistence.ts` → aggiornato per usare Material
- [ ] `src/app/api/tools/saved/route.ts` → ora usa Material via tool-persistence.ts

---

## Fase 3: Sistema Riassunti

### 3.1 Inactivity Monitor

**File**: `src/lib/conversation/inactivity-monitor.ts`

- [ ] Timer per ogni conversazione attiva
- [ ] Reset ad ogni messaggio
- [ ] Dopo 15min → trigger `endConversationWithSummary()`

### 3.2 Summary Generator

**File**: `src/lib/conversation/summary-generator.ts`

- [ ] Fetch messaggi conversazione
- [ ] Usare `src/lib/ai/summarize.ts` esistente
- [ ] Salvare in `Conversation.summary`, `keyFacts`, `topics`
- [ ] Salvare learnings in `Learning` table
- [ ] Marcare conversazione `isActive: false`

### 3.3 API Endpoint

**File**: `src/app/api/conversations/[id]/end/route.ts`

- [ ] POST → chiude conversazione, genera riassunto + valutazione + nota genitori

---

## Fase 4: Saluto Contestuale

### 4.1 Greeting Generator

**File**: `src/lib/conversation/contextual-greeting.ts`

```typescript
async function generateContextualGreeting({
  studentName,
  maestroName,
  previousSummary,
  previousTopics,
  lastSessionDate
}): Promise<string>
```

### 4.2 Store Integration

**File**: `src/lib/stores/conversation-flow-store.ts`

- [ ] In `switchToCharacter()`: caricare ultima conversazione per characterId
- [ ] Se ha summary → generare saluto contestuale
- [ ] Usare come primo messaggio invece del greeting default

---

## Fase 5: Sistema Valutazioni

### 5.1 Modal Auto-valutazione

**File**: `src/components/session/session-rating-modal.tsx`

- [ ] 5 stelle + commento opzionale
- [ ] Mostrato quando sessione finisce

### 5.2 Valutazione AI Maestro

**File**: `src/lib/session/maestro-evaluation.ts`

- [ ] `generateMaestroEvaluation(messages, studentProfile)`
- [ ] Returns: score (1-10), feedback, strengths[], areasToImprove[]

### 5.3 Update Session API

**File**: `src/app/api/progress/sessions/route.ts`

- [ ] Estendere PATCH per salvare ratings, topics, conversationId

---

## Fase 6: Note Genitori

### 6.1 Generator

**File**: `src/lib/session/parent-note-generator.ts`

- [ ] `generateParentNote(session, summary, evaluation)`
- [ ] Returns: summary, highlights[], concerns[], suggestions[]

### 6.2 API

**File**: `src/app/api/parent-notes/route.ts`

- [ ] GET: Lista note per userId
- [ ] POST: Crea nota (chiamato internamente)

### 6.3 Dashboard Integration

**File**: `src/components/parent/parent-dashboard.tsx`

- [ ] Aggiungere sezione "Note Recenti"

---

## Fase 7: Frontend Integration

### 7.1 Conversation Flow

- [ ] Bottone "Termina Sessione"
- [ ] Integrare inactivity monitor
- [ ] Mostrare rating modal a fine sessione

### 7.2 Character Chat View

- [ ] Stesso trattamento per coach/buddy

### 7.3 Store Updates

- [ ] `endConversationWithSummary()`
- [ ] `loadLastConversationSummary(characterId)`

---

## File Critici

| File | Modifiche |
|------|-----------|
| `prisma/schema.prisma` | StudySession, Material, ParentNote |
| `src/lib/stores/conversation-flow-store.ts` | Summary triggers, greeting loading |
| `src/lib/ai/summarize.ts` | Già esiste, da usare |
| `src/lib/tools/tool-persistence.ts` | Deprecare |
| `src/app/api/progress/sessions/route.ts` | Estendere PATCH |
| `src/components/conversation/conversation-flow.tsx` | End session flow |

---

## Nuovi File

| File | Scopo |
|------|-------|
| `src/lib/conversation/inactivity-monitor.ts` | Timer 15min |
| `src/lib/conversation/summary-generator.ts` | Genera e salva riassunti |
| `src/lib/conversation/contextual-greeting.ts` | Saluti contestuali |
| `src/lib/session/maestro-evaluation.ts` | Valutazione AI |
| `src/lib/session/parent-note-generator.ts` | Note genitori |
| `src/components/session/session-rating-modal.tsx` | UI auto-valutazione |
| `src/app/api/conversations/[id]/end/route.ts` | Endpoint chiusura |
| `src/app/api/parent-notes/route.ts` | API note genitori |
| `scripts/migrate-created-tools.ts` | Migrazione DB |

---

## Test Plan

- [ ] Unit: Summary generation
- [ ] Unit: Greeting generation
- [ ] Unit: Rating calculation
- [ ] Integration: Session end flow completo
- [ ] Integration: Inactivity timeout
- [ ] E2E: Ciclo vita sessione completo

---

## Fase 8: Documentazione

### 8.1 ADR

**File**: `docs/adr/0016-conversation-summary-unified-archive.md`

- [ ] Descrivere la decisione di unificare Material + CreatedTool
- [ ] Descrivere il sistema di riassunti a fine sessione
- [ ] Descrivere il trigger (esplicito + 15min timeout)

### 8.2 Claude Docs

**File**: `docs/claude/session-summaries.md`

- [ ] Documentazione per Claude su come funziona il sistema
- [ ] API endpoints disponibili
- [ ] Come generare saluti contestuali

### 8.3 CHANGELOG

**File**: `CHANGELOG.md`

- [ ] Aggiungere sezione per questa feature
- [ ] Descrivere breaking changes (se presenti)

### 8.4 README (se necessario)

- [ ] Aggiornare sezione features
- [ ] Aggiungere note sulla gestione sessioni
