# Study Kit Generator - Piano di Implementazione

**Data**: 2026-01-02
**Feature**: Trasformazione documenti complessi in kit di studio accessibili
**Stato**: ARCHIVED - Incorporato in MasterPlan-v2.1-2026-01-02.md (WAVE 2)

---

## ARCHIVAL NOTE (2026-01-02)

Questo piano è stato incorporato in: `docs/plans/doing/MasterPlan-v2.1-2026-01-02.md`
Vedere **WAVE 2: Study Kit Generator** per l'implementazione.

---

## 1. Obiettivo

Creare una funzionalità che prenda un PDF da libro di testo e generi automaticamente:
1. **Riassunto Semplificato** - Linguaggio accessibile, formato Q&A, sintesi per sezione
2. **Mappa Mentale** - Visualizzazione gerarchica dei concetti
3. **Demo Interattiva** - HTML/CSS/JS che illustra i concetti
4. **Quiz** - Domande a scelta multipla con spiegazioni

**Target**: Studenti con difficoltà di apprendimento (DSA, ADHD, etc.)

---

## 2. Analisi Dipendenze (2026-01-02)

### Infrastruttura Esistente (Riutilizzabile)

| Componente | Path | Status |
|------------|------|--------|
| PDF Processing (client) | `src/lib/pdf/pdf-processor.ts` | Completo |
| PDF Preview | `src/components/tools/pdf-preview.tsx` | Completo |
| Subject Detection | `src/lib/ai/intent-detection.ts` | Completo (15 materie) |
| SSE Streaming | `src/lib/realtime/tool-events.ts` | Completo |
| Tool State Management | `src/lib/realtime/tool-state.ts` | Completo |
| Tool Handlers | `src/lib/tools/handlers/*.ts` | 7 tipi completi |
| Collection API | `src/app/api/collections/route.ts` | Completo |
| Material API | `src/app/api/materials/route.ts` | Completo |
| Types System | `src/types/tools.ts` | Estensibile |

### Da Implementare

| Componente | Descrizione |
|------------|-------------|
| `src/types/study-kit.ts` | Types per StudyKit |
| `src/app/api/study-kit/*` | API routes per generazione |
| `src/lib/tools/handlers/study-kit-handler.ts` | Orchestrazione batch |
| `src/lib/prompts/simplification-prompt.ts` | Template Feynman |
| `src/components/education/study-kit/*` | UI components |

---

## 3. Decisioni Architetturali

| Aspetto | Decisione |
|---------|-----------|
| **Entry Point** | Knowledge Hub - bottone "Crea Study Kit" |
| **Limite PDF** | 10 pagine max (capitoli singoli) |
| **Selezione Maestro** | Auto-detect materia + override manuale |
| **Maestro Default** | Richard Feynman (specialista semplificazione) |
| **Storage** | Collection per raggruppare i 4 materiali |
| **Progress Updates** | SSE (già esistente) |

---

## 4. Data Flow

```
PDF Upload (max 10 pagine)
    ↓
pdf-processor.ts → Converti pagine in immagini
    ↓
Vision API (GPT-4o) → Estrai testo + struttura
    ↓
Subject Detector → Rileva materia → Suggerisci Maestro
    ↓
StudyKit Handler → Genera in sequenza:
    ├── 1. Riassunto Semplificato (Feynman style)
    ├── 2. Mappa Mentale
    ├── 3. Demo Interattiva
    └── 4. Quiz
    ↓
Collection "Study Kit: [Topic]" → 4 Materials collegati
```

---

## 5. File da Creare

### Types
```
src/types/study-kit.ts
```

### API Routes
```
src/app/api/study-kit/
  route.ts              # GET list, DELETE kit
  generate/route.ts     # POST orchestrazione
  status/[id]/route.ts  # GET SSE progress
```

### Handlers
```
src/lib/tools/handlers/study-kit-handler.ts
src/lib/prompts/simplification-prompt.ts
```

### UI Components
```
src/components/education/study-kit/
  study-kit-generator.tsx
  pdf-upload-zone.tsx
  maestro-selector.tsx
  generation-progress.tsx
  study-kit-viewer.tsx
```

---

## 6. File da Modificare

| File | Modifica |
|------|----------|
| `src/types/tools.ts` | Aggiungere `'study-kit'` a `ToolType` |
| `src/app/api/materials/route.ts` | Aggiungere `'study-kit'` a `VALID_MATERIAL_TYPES` |
| `src/lib/tools/handlers/index.ts` | Registrare handler |
| `src/components/education/knowledge-hub/knowledge-hub.tsx` | Bottone "Crea Study Kit" |
| `src/components/education/knowledge-hub/renderers/index.tsx` | Registrare renderer |

---

## 7. Criteri di Completamento

- [ ] Upload PDF e visualizzazione anteprima
- [ ] Auto-detect materia con >80% accuratezza
- [ ] Generazione 4 output in <3 minuti per 10 pagine
- [ ] Salvataggio come Collection nel Knowledge Hub
- [ ] Tutti i 7 profili accessibilità supportati
- [ ] Test E2E passing
- [ ] WCAG 2.1 AA compliance

---

## 8. Riferimenti

- **Successore**: `docs/plans/doing/MasterPlan-v2.1-2026-01-02.md` WAVE 2
- **File critici**: Vedere sezione 10 del documento originale

---

*Archiviato: 2 Gennaio 2026*
*Successore: MasterPlan-v2.1-2026-01-02.md WAVE 2*
