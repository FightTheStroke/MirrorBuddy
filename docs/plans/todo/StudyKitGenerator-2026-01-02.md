# Study Kit Generator - Piano di Implementazione

**Data**: 2026-01-02
**Feature**: Trasformazione documenti complessi in kit di studio accessibili
**Branch**: `feature/study-kit-generator`

---

## 1. Obiettivo

Creare una funzionalità che prenda un PDF da libro di testo e generi automaticamente:
1. **Riassunto Semplificato** - Linguaggio accessibile, formato Q&A, sintesi per sezione
2. **Mappa Mentale** - Visualizzazione gerarchica dei concetti
3. **Demo Interattiva** - HTML/CSS/JS che illustra i concetti
4. **Quiz** - Domande a scelta multipla con spiegazioni

**Target**: Studenti con difficoltà di apprendimento (DSA, ADHD, etc.)

---

## 2. Decisioni Architetturali

| Aspetto | Decisione |
|---------|-----------|
| **Entry Point** | Knowledge Hub - bottone "Crea Study Kit" nella toolbar |
| **Limite PDF** | 10 pagine max (capitoli singoli) |
| **Selezione Maestro** | Auto-detect materia + possibilità override manuale |
| **Maestro Default** | Richard Feynman (specialista semplificazione) |
| **Storage** | Collection per raggruppare i 4 materiali generati |
| **Progress Updates** | SSE (Server-Sent Events) esistente |

---

## 3. Data Flow

```
PDF Upload
    │
    ▼
PDF Processor (pdf.js) ──► Converti pagine in immagini (max 10)
    │
    ▼
Vision API (GPT-4o) ──► Estrai testo + struttura
    │
    ▼
Subject Detector ──► Rileva materia → Suggerisci Maestro
    │
    ▼
Orchestrator API ──► Genera in sequenza:
    │
    ├──► 1. Riassunto Semplificato (Feynman style)
    │         │
    │         ▼
    ├──► 2. Mappa Mentale (dal riassunto)
    │         │
    ├──► 3. Demo Interattiva (parallelo)
    │         │
    └──► 4. Quiz (dal riassunto)
    │
    ▼
Collection "Study Kit: [Topic]" ──► 4 Materials collegati
    │
    ▼
Knowledge Hub ──► Visualizzazione con tabs
```

---

## 4. File da Creare

### 4.1 Types
```
src/types/study-kit.ts
```
- `StudyKitConfig` - opzioni utente
- `StudyKitProgress` - tracking generazione
- `StudyKitResult` - output finale
- `SimplifiedSection` - sezione Q&A con sintesi

### 4.2 API Routes
```
src/app/api/study-kit/
  route.ts              # GET list, DELETE kit
  generate/route.ts     # POST orchestrazione
  status/[id]/route.ts  # GET SSE progress
```

### 4.3 Handlers
```
src/lib/tools/handlers/study-kit-handler.ts   # Orchestrazione generazione
src/lib/ai/subject-detector.ts                # Rilevamento materia
src/lib/prompts/simplification-prompt.ts      # Template Feynman
```

### 4.4 UI Components
```
src/components/education/study-kit/
  index.ts                    # Exports
  study-kit-generator.tsx     # Dialog principale
  pdf-upload-zone.tsx         # Drag-drop upload
  maestro-selector.tsx        # Selezione AI
  generation-progress.tsx     # Progress bar SSE
  study-kit-viewer.tsx        # Viewer 4 tabs
  study-kit-card.tsx          # Card per Knowledge Hub

src/components/education/study-kit/hooks/
  use-study-kit-generator.ts  # State management
  use-study-kit-progress.ts   # SSE subscription
```

### 4.5 Knowledge Hub Renderer
```
src/components/education/knowledge-hub/renderers/study-kit-renderer.tsx
```

---

## 5. File da Modificare

| File | Modifica |
|------|----------|
| `src/types/tools.ts` | Aggiungere `'study-kit'` a `ToolType` |
| `src/app/api/materials/route.ts` | Aggiungere `'study-kit'` a `VALID_MATERIAL_TYPES` |
| `src/lib/tools/handlers/index.ts` | Registrare `study-kit-handler` |
| `src/components/education/knowledge-hub/knowledge-hub.tsx` | Aggiungere bottone "Crea Study Kit" |
| `src/components/education/knowledge-hub/renderers/index.tsx` | Registrare `StudyKitRenderer` |

---

## 6. API Specification

### POST `/api/study-kit/generate`

**Request:**
```typescript
{
  documentId: string;           // Material ID del PDF caricato
  subject?: Subject;            // Override materia (opzionale)
  maestroId?: string;           // Override maestro (opzionale)
  options: {
    summaryLength: 'short' | 'medium' | 'long';
    quizQuestionCount: number;  // 5-15
    accessibilityProfile?: string;
  }
}
```

**Response:**
```typescript
{
  studyKitId: string;           // Collection ID
  status: 'processing';
  streamUrl: string;            // /api/study-kit/status/{id}
}
```

### GET `/api/study-kit/status/[id]` (SSE)

**Events:**
```typescript
// Progress updates
event: progress
data: { phase: string; progress: number; materialId?: string }

// Completion
event: complete
data: { studyKitId: string; materials: Material[] }

// Error
event: error
data: { error: string; phase: string }
```

---

## 7. Prompt Semplificazione (Feynman Style)

```typescript
export const SIMPLIFICATION_PROMPT = `
Sei Richard Feynman. Il tuo compito è spiegare questo contenuto a uno studente.

REGOLE DI SEMPLIFICAZIONE:
1. Linguaggio colloquiale e conversazionale
2. Spiega come se parlassi a un dodicenne
3. Usa analogie ed esempi quotidiani (es. "pentola sul fuoco")
4. Struttura in formato domanda-risposta:
   - "Cos'è [concetto]?" → risposta semplice
   - "Perché è importante?" → rilevanza pratica
   - "Come me lo ricordo?" → analogia o trucco mnemonico
5. Dopo ogni sezione: box "SINTESI" con punti chiave
6. Parole chiave in **grassetto**
7. Frasi brevi (max 20 parole)

OUTPUT JSON:
{
  "topic": "Titolo dell'argomento",
  "sections": [
    {
      "title": "Domanda come titolo",
      "content": "Spiegazione semplice",
      "keyPoints": ["Punto 1", "Punto 2"]
    }
  ]
}
`;
```

---

## 8. Fasi di Implementazione

### Fase 1: Foundation
- [ ] Creare `src/types/study-kit.ts`
- [ ] Creare `src/lib/prompts/simplification-prompt.ts`
- [ ] Creare `src/lib/ai/subject-detector.ts`
- [ ] Aggiungere `'study-kit'` ai tipi esistenti

### Fase 2: API Layer
- [ ] Creare `/api/study-kit/generate/route.ts`
- [ ] Creare `/api/study-kit/status/[id]/route.ts`
- [ ] Creare `/api/study-kit/route.ts`
- [ ] Creare `src/lib/tools/handlers/study-kit-handler.ts`
- [ ] Registrare handler in index

### Fase 3: UI - Upload e Configurazione
- [ ] Creare `pdf-upload-zone.tsx` (drag-drop)
- [ ] Creare `maestro-selector.tsx` (auto-detect + manual)
- [ ] Creare `generation-progress.tsx` (SSE progress)
- [ ] Creare hooks

### Fase 4: UI - Generator e Viewer
- [ ] Creare `study-kit-generator.tsx` (dialog principale)
- [ ] Creare `study-kit-viewer.tsx` (4 tabs)
- [ ] Creare `study-kit-card.tsx` (Knowledge Hub card)

### Fase 5: Knowledge Hub Integration
- [ ] Aggiungere bottone "Crea Study Kit" al header
- [ ] Registrare `StudyKitRenderer`
- [ ] Collegare Collection display per Study Kit

### Fase 6: Accessibility e Polish
- [ ] Applicare profili accessibilità al contenuto generato
- [ ] Keyboard navigation
- [ ] ARIA labels
- [ ] Test con 7 profili accessibilità

### Fase 7: Testing
- [ ] Unit test subject detector
- [ ] Integration test API generazione
- [ ] E2E test flusso completo
- [ ] Audit accessibilità WCAG 2.1 AA

---

## 9. UI Mockup

### Study Kit Generator Dialog

```
┌──────────────────────────────────────────────────────────────┐
│  Crea Study Kit                                         [X]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────────────────────────────────────────────┐   │
│   │                                                      │   │
│   │        [PDF icon]                                    │   │
│   │        Trascina qui il PDF                           │   │
│   │        oppure clicca per sfogliare                   │   │
│   │                                                      │   │
│   │        Max 10 pagine, ideale per capitoli            │   │
│   │                                                      │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                              │
│   Materia:  [Auto-rilevata: Fisica ▾] [Cambia]               │
│   Maestro:  [Richard Feynman ▾]                              │
│                                                              │
│   Opzioni:                                                   │
│   Lunghezza riassunto: ( ) Breve (x) Medio ( ) Lungo         │
│   Domande quiz: [10 ▾]                                       │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐   │
│   │  [Genera Study Kit]                                  │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Generation Progress

```
┌──────────────────────────────────────────────────────────────┐
│  Generazione in corso...                                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   [████████████████████░░░░░░░░░░] 65%                       │
│                                                              │
│   [✓] Estrazione testo dal PDF                               │
│   [✓] Analisi struttura contenuto                            │
│   [✓] Riassunto semplificato                                 │
│   [○] Creazione mappa mentale...                             │
│   [ ] Demo interattiva                                       │
│   [ ] Quiz                                                   │
│                                                              │
│   [Annulla]                                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Study Kit Viewer (4 Tabs)

```
┌──────────────────────────────────────────────────────────────┐
│  Study Kit: Effetto Serra                                    │
├──────────────────────────────────────────────────────────────┤
│  [Riassunto] [Mappa] [Demo] [Quiz]                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ## Cos'è l'effetto serra?                                   │
│                                                              │
│  Immagina la Terra avvolta in una coperta invisibile.        │
│  Questa coperta è fatta di gas speciali nell'aria che        │
│  trattengono il calore del Sole.                             │
│                                                              │
│  **SINTESI**:                                                │
│  • L'effetto serra è naturale e necessario                   │
│  • Senza di esso farebbe -17°C                               │
│  • I gas serra "intrappolano" il calore                      │
│                                                              │
│  ## Perché è importante?                                     │
│  ...                                                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 10. File Critici di Riferimento

| File | Motivo |
|------|--------|
| `src/lib/tools/handlers/summary-handler.ts` | Pattern per handler |
| `src/lib/pdf/pdf-processor.ts` | Elaborazione PDF esistente |
| `src/app/api/materials/route.ts` | Pattern CRUD API |
| `src/components/education/knowledge-hub/knowledge-hub.tsx` | Integration point |
| `src/data/maestri/feynman.ts` | Stile semplificazione |
| `src/lib/tools/summary-export.ts` | Conversione summary→mindmap |

---

## 11. Rischi e Mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Tempi elaborazione lunghi | Limite 10 pagine, progress SSE real-time |
| Rate limit Vision API | Batch pagine, delay tra richieste |
| Errori detection materia | Override manuale sempre disponibile |
| Qualità quiz variabile | Genera quiz dal riassunto (non dal PDF grezzo) |
| Fallimento generazione | Retry con backoff, salva risultati parziali |

---

## 12. Criteri di Completamento

- [ ] Upload PDF e visualizzazione anteprima
- [ ] Auto-detect materia con >80% accuratezza
- [ ] Generazione 4 output in <3 minuti per 10 pagine
- [ ] Salvataggio come Collection nel Knowledge Hub
- [ ] Tutti i 7 profili accessibilità supportati
- [ ] Test E2E passing
- [ ] WCAG 2.1 AA compliance
