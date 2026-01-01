# Master Plan - Sprint Gennaio 2026

**Data**: 2026-01-01
**Branch**: `development`
**Strategia**: Seriale, un task alla volta, Thor verifica ogni task
**Commit**: Uno per task completato

---

## ZERO TOLERANCE POLICY

**NESSUNA ASSUNZIONE SUL LAVORO PRECEDENTE**

Tutto quello fatto finora potrebbe essere un casino. Ogni task va:
1. **Verificato da zero** - Non fidarsi di nulla
2. **Testato completamente** - Ogni singola funzionalita
3. **Pulito** - Rimuovere qualsiasi merda lasciata
4. **Documentato** - Se non c'e prova, non esiste

---

## REGOLE DI ESECUZIONE

1. **SEMPRE su branch `development`** - Mai worktree separati
2. **Un task alla volta** - Completare prima di iniziare il successivo
3. **Thor verifica ogni task** - Nessun task e completo senza Thor approval
4. **Un commit per task** - Messaggio conventional, footer Claude Code
5. **Test obbligatori** - `npm run lint && npm run typecheck && npm run build` dopo ogni task
6. **Coverage 80%** - Test per ogni nuovo file
7. **NIENTE SCORCIATOIE** - Se sembra fatto, riverifica comunque
8. **NIENTE ASSUNZIONI** - Leggi il codice, non presumere

---

## OBIETTIVI FINALI

Queste sono le 5 cose che l'utente vuole. TUTTO il lavoro serve a questi obiettivi:

| # | Obiettivo | Cosa significa |
|---|-----------|----------------|
| A | **Mindmaps funzionano** | title field, hierarchy, AI prompts corretti |
| B | **Maestri hanno memoria** | Ricordano conversazioni precedenti |
| C | **Tool creation ha UX corretta** | Dialog per scegliere maestro/modalita prima di creare |
| D | **Materiali organizzati** | Knowledge Hub con search, collections, views |
| E | **Codebase documentata** | ARCHITECTURE.md, ADRs aggiornati |

---

## FASE 1: DATABASE & TYPES

Prima di tutto: le fondamenta. Schema e tipi devono essere corretti.

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 1.01 | Fix types in tools.ts (MindmapData.title) | `src/types/tools.ts` | | |
| 1.02 | Add searchableText field to Material model | `prisma/schema.prisma` | | |
| 1.03 | Add Collection model | `prisma/schema.prisma` | | |
| 1.04 | Add Tag and MaterialTag models | `prisma/schema.prisma` | | |
| 1.05 | Run Prisma migration | - | | |
| 1.06 | Verify all types compile | `npm run typecheck` | | |

---

## FASE 2: CORE LIBRARIES

Utility functions e business logic. Nessuna dipendenza da UI.

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 2.01 | Create mindmap-utils.ts (markdown conversion) | `src/lib/tools/mindmap-utils.ts` | | |
| 2.02 | Create memory-loader.ts | `src/lib/conversation/memory-loader.ts` | | |
| 2.03 | Create prompt-enhancer.ts | `src/lib/conversation/prompt-enhancer.ts` | | |
| 2.04 | Create knowledge-base-v2.ts (lazy retrieval) | `src/lib/ai/app-knowledge-base-v2.ts` | | |
| 2.05 | Create searchable-text.ts (Fuse.js) | `src/lib/search/searchable-text.ts` | | |
| 2.06 | Create material-export.ts | `src/lib/export/material-export.ts` | | |
| 2.07 | Install fuse.js | `package.json` | | |
| 2.08 | Unit tests for mindmap-utils | `src/lib/tools/__tests__/mindmap-utils.test.ts` | | |
| 2.09 | Unit tests for memory-loader | `src/lib/conversation/__tests__/memory-loader.test.ts` | | |
| 2.10 | Unit tests for prompt-enhancer | `src/lib/conversation/__tests__/prompt-enhancer.test.ts` | | |
| 2.11 | Unit tests for knowledge-base-v2 | `src/lib/ai/__tests__/app-knowledge-base-v2.test.ts` | | |
| 2.12 | Unit tests for searchable-text | `src/lib/search/__tests__/searchable-text.test.ts` | | |

---

## FASE 3: STORES

State management updates. Altri componenti dipendono da questi.

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 3.01 | Add focusInteractionMode to app-store | `src/lib/stores/app-store.ts` | | |
| 3.02 | Update enterFocusMode signature | `src/lib/stores/app-store.ts` | | |
| 3.03 | Update exitFocusMode to reset mode | `src/lib/stores/app-store.ts` | | |
| 3.04 | Modify conversation-flow-store for memory | `src/lib/stores/conversation-flow-store.ts` | | |
| 3.05 | Unit tests for store changes | `src/lib/stores/__tests__/app-store.test.ts` | | |

---

## FASE 4: API ROUTES

Backend endpoints. Tutti gli API necessari.

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 4.01 | Create /api/conversations/memory | `src/app/api/conversations/memory/route.ts` | | |
| 4.02 | Create /api/collections | `src/app/api/collections/route.ts` | | |
| 4.03 | Create /api/tags | `src/app/api/tags/route.ts` | | |
| 4.04 | Update /api/materials for searchableText | `src/app/api/materials/route.ts` | | |
| 4.05 | Update /api/materials for collection/tag filters | `src/app/api/materials/route.ts` | | |
| 4.06 | Create /api/materials/bulk | `src/app/api/materials/bulk/route.ts` | | |
| 4.07 | Update /api/chat for content with tool calls | `src/app/api/chat/route.ts` | | |

---

## FASE 5: BASE COMPONENTS

Componenti riutilizzabili. Le views dipendono da questi.

### 5A: Tool Selection Dialog

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 5.01 | Create ToolMaestroSelectionDialog | `src/components/education/tool-maestro-selection-dialog.tsx` | | |
| 5.02 | Unit tests for dialog | `src/components/education/__tests__/tool-maestro-selection-dialog.test.tsx` | | |

### 5B: Knowledge Hub Renderers

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 5.03 | Create renderer registry | `src/components/education/knowledge-hub/renderers/index.ts` | | |
| 5.04 | MindmapRenderer | `src/components/education/knowledge-hub/renderers/mindmap-renderer.tsx` | | |
| 5.05 | QuizRenderer | `src/components/education/knowledge-hub/renderers/quiz-renderer.tsx` | | |
| 5.06 | FlashcardRenderer | `src/components/education/knowledge-hub/renderers/flashcard-renderer.tsx` | | |
| 5.07 | SummaryRenderer | `src/components/education/knowledge-hub/renderers/summary-renderer.tsx` | | |
| 5.08 | DemoRenderer | `src/components/education/knowledge-hub/renderers/demo-renderer.tsx` | | |
| 5.09 | DiagramRenderer (Mermaid) | `src/components/education/knowledge-hub/renderers/diagram-renderer.tsx` | | |
| 5.10 | TimelineRenderer | `src/components/education/knowledge-hub/renderers/timeline-renderer.tsx` | | |
| 5.11 | FormulaRenderer (KaTeX) | `src/components/education/knowledge-hub/renderers/formula-renderer.tsx` | | |
| 5.12 | ChartRenderer | `src/components/education/knowledge-hub/renderers/chart-renderer.tsx` | | |
| 5.13 | ImageRenderer | `src/components/education/knowledge-hub/renderers/image-renderer.tsx` | | |
| 5.14 | PdfRenderer | `src/components/education/knowledge-hub/renderers/pdf-renderer.tsx` | | |
| 5.15 | HomeworkRenderer | `src/components/education/knowledge-hub/renderers/homework-renderer.tsx` | | |
| 5.16 | Unit tests for all renderers | `src/components/education/knowledge-hub/renderers/__tests__/` | | |

### 5C: Knowledge Hub Components

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 5.17 | SearchBar component | `src/components/education/knowledge-hub/components/search-bar.tsx` | | |
| 5.18 | SidebarNavigation component | `src/components/education/knowledge-hub/components/sidebar-navigation.tsx` | | |
| 5.19 | QuickActions component | `src/components/education/knowledge-hub/components/quick-actions.tsx` | | |
| 5.20 | BulkToolbar component | `src/components/education/knowledge-hub/components/bulk-toolbar.tsx` | | |
| 5.21 | StatsPanel component | `src/components/education/knowledge-hub/components/stats-panel.tsx` | | |
| 5.22 | MaterialCard with drag & drop | `src/components/education/knowledge-hub/components/material-card.tsx` | | |

### 5D: Knowledge Hub Hooks

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 5.23 | useMaterialsSearch hook | `src/components/education/knowledge-hub/hooks/use-materials-search.ts` | | |
| 5.24 | useCollections hook | `src/components/education/knowledge-hub/hooks/use-collections.ts` | | |
| 5.25 | useTags hook | `src/components/education/knowledge-hub/hooks/use-tags.ts` | | |
| 5.26 | useSmartCollections hook | `src/components/education/knowledge-hub/hooks/use-smart-collections.ts` | | |
| 5.27 | useBulkActions hook | `src/components/education/knowledge-hub/hooks/use-bulk-actions.ts` | | |
| 5.28 | Unit tests for all hooks | `src/components/education/knowledge-hub/hooks/__tests__/` | | |

---

## FASE 6: HANDLERS & CORE FIXES

Fix ai handlers e core rendering logic.

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 6.01 | Fix mindmap-handler.ts (use 'title' field) | `src/lib/tools/handlers/mindmap-handler.ts` | | |
| 6.02 | Fix markmap-renderer.tsx (markdown/nodes) | `src/components/tools/markmap-renderer.tsx` | | |
| 6.03 | Fix use-saved-materials.ts (map topic->title) | `src/lib/hooks/use-saved-materials.ts` | | |
| 6.04 | Update voice-tool-commands.ts (hierarchy examples) | `src/lib/voice/voice-tool-commands.ts` | | |
| 6.05 | Update support-teachers.ts (use v2 knowledge base) | `src/lib/ai/support-teachers.ts` | | |
| 6.06 | Update MaterialViewer (use renderer registry) | `src/components/education/archive/material-viewer.tsx` | | |
| 6.07 | Unit tests for mindmap-handler | `src/lib/tools/handlers/__tests__/mindmap-handler.test.ts` | | |

---

## FASE 7: VIEWS

Tutte le view updates. User-facing pages.

### 7A: Tool View Updates (Dialog Integration)

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 7.01 | Update summaries-view with dialog | `src/components/education/summaries-view.tsx` | | |
| 7.02 | Update mindmaps-view with dialog | `src/components/education/mindmaps-view.tsx` | | |
| 7.03 | Update flashcards-view with dialog | `src/components/education/flashcards-view.tsx` | | |
| 7.04 | Update quiz-view with dialog | `src/components/education/quiz-view.tsx` | | |

### 7B: Focus Tool Layout (Voice Integration)

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 7.05 | Add voice integration to focus-tool-layout | `src/components/tools/focus-tool-layout.tsx` | | |
| 7.06 | Voice connection on mode='voice' | `src/components/tools/focus-tool-layout.tsx` | | |
| 7.07 | Voice UI (mute, end call, levels) | `src/components/tools/focus-tool-layout.tsx` | | |

### 7C: Knowledge Hub Views

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 7.08 | Install react-resizable-panels | `package.json` | | |
| 7.09 | Create ExplorerView | `src/components/education/knowledge-hub/views/explorer-view.tsx` | | |
| 7.10 | Create GalleryView | `src/components/education/knowledge-hub/views/gallery-view.tsx` | | |
| 7.11 | Create TimelineView | `src/components/education/knowledge-hub/views/timeline-view.tsx` | | |
| 7.12 | Create CalendarView | `src/components/education/knowledge-hub/views/calendar-view.tsx` | | |
| 7.13 | Update archive-view with search | `src/components/education/archive-view.tsx` | | |
| 7.14 | Create knowledge-hub.tsx (main) | `src/components/education/knowledge-hub/knowledge-hub.tsx` | | |
| 7.15 | Add view switcher | `src/components/education/knowledge-hub/knowledge-hub.tsx` | | |
| 7.16 | Add quick preview on hover | `src/components/education/knowledge-hub/components/material-card.tsx` | | |

### 7D: Conversation Memory Integration

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 7.17 | Integrate memory in conversation-flow.tsx | `src/components/conversation/conversation-flow.tsx` | | |

---

## FASE 8: SCRIPTS & MIGRATIONS

Scripts one-time e data migrations.

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 8.01 | Create backfill-searchable.ts | `scripts/backfill-searchable.ts` | | |
| 8.02 | Run backfill script | - | | |

---

## FASE 9: E2E & INTEGRATION TESTS

Tests che attraversano tutto il sistema.

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 9.01 | E2E test mindmap-hierarchy.spec.ts | `e2e/mindmap-hierarchy.spec.ts` | | |
| 9.02 | E2E test knowledge-hub.spec.ts | `e2e/knowledge-hub.spec.ts` | | |
| 9.03 | Integration test memory flow | `src/lib/conversation/__tests__/memory-integration.test.ts` | | |
| 9.04 | Manual test: all 5 tool flows | - | | |
| 9.05 | Manual test: voice mode | - | | |
| 9.06 | Manual test: knowledge hub search | - | | |

---

## FASE 10: DOCUMENTATION

Tutta la documentazione.

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 10.01 | Create ARCHITECTURE.md | `docs/ARCHITECTURE.md` | | |
| 10.02 | - Document 17 Maestri | `docs/ARCHITECTURE.md` | | |
| 10.03 | - Document Triangle of Support | `docs/ARCHITECTURE.md` | | |
| 10.04 | - Document all tools | `docs/ARCHITECTURE.md` | | |
| 10.05 | - Document gamification | `docs/ARCHITECTURE.md` | | |
| 10.06 | - Document accessibility | `docs/ARCHITECTURE.md` | | |
| 10.07 | - Document audio system | `docs/ARCHITECTURE.md` | | |
| 10.08 | - Document GDPR/parent dashboard | `docs/ARCHITECTURE.md` | | |
| 10.09 | - Document state management | `docs/ARCHITECTURE.md` | | |
| 10.10 | - Document AI providers | `docs/ARCHITECTURE.md` | | |
| 10.11 | Create ADR 0021 memory injection | `docs/adr/0021-conversational-memory-injection.md` | | |
| 10.12 | Create ADR 0022 knowledge hub | `docs/adr/0022-knowledge-hub-architecture.md` | | |
| 10.13 | Create conversation-memory.md | `docs/claude/conversation-memory.md` | | |
| 10.14 | Create knowledge-hub.md | `docs/claude/knowledge-hub.md` | | |
| 10.15 | Update CHANGELOG | `CHANGELOG.md` | | |

---

## FASE 11: RELEASE MANAGER

Updates al release manager per ConvergioEdu.

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 11.01 | Add WCAG 2.1 AA checks | `.claude/agents/app-release-manager.md` | | |
| 11.02 | Add GDPR compliance for minors | `.claude/agents/app-release-manager.md` | | |
| 11.03 | Add AI safety guardrails validation | `.claude/agents/app-release-manager.md` | | |
| 11.04 | Add E2E educational flows | `.claude/agents/app-release-manager.md` | | |

---

## FASE 12: FINAL VERIFICATION

Verifica finale completa.

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 12.01 | Full lint check | - | | |
| 12.02 | Full typecheck | - | | |
| 12.03 | Full build | - | | |
| 12.04 | Full test suite | - | | |
| 12.05 | Verify all objectives met | - | | |
| 12.06 | Final Thor review | - | | |

---

## VERIFICHE PER OGNI TASK

**OBBLIGATORIE - NESSUNA ECCEZIONE**

```bash
# 1. Lint - DEVE essere 0 errori, 0 warnings
npm run lint

# 2. Typecheck - DEVE essere 0 errori
npm run typecheck

# 3. Build - DEVE passare
npm run build

# 4. Tests - TUTTI devono passare
npm run test

# 5. Thor review - DEVE approvare
```

### Checklist Thor per ogni task:
- [ ] Nessun console.log
- [ ] Nessun TODO dimenticato
- [ ] Nessun codice commentato
- [ ] Types corretti e completi
- [ ] Nessun any
- [ ] Error handling presente
- [ ] Test coverage >= 80%
- [ ] Nessuna vulnerabilita security
- [ ] Accessibilita rispettata (se UI)

---

## FORMATO COMMIT

```
<type>(<scope>): <description>

[body - dettagli implementazione]

Task: <ID> (es. 1.01)

Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Tipi: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

---

## PROGRESS TRACKER

| Fase | Completati | Totale | % |
|------|:----------:|:------:|:-:|
| 1. Database & Types | 0 | 6 | 0% |
| 2. Core Libraries | 0 | 12 | 0% |
| 3. Stores | 0 | 5 | 0% |
| 4. API Routes | 0 | 7 | 0% |
| 5. Base Components | 0 | 28 | 0% |
| 6. Handlers & Fixes | 0 | 7 | 0% |
| 7. Views | 0 | 17 | 0% |
| 8. Scripts | 0 | 2 | 0% |
| 9. E2E Tests | 0 | 6 | 0% |
| 10. Documentation | 0 | 15 | 0% |
| 11. Release Manager | 0 | 4 | 0% |
| 12. Final Verification | 0 | 6 | 0% |
| **TOTALE** | **0** | **115** | **0%** |

---

## REFERENCE

I vecchi piani dettagliati sono in `docs/plans/reference/` per consultazione:
- `MindmapDataStructureFix-2026-01-01.md`
- `ConversationalMemoryInjection-2026-01-01.md`
- `ToolFocusModeSelection-2026-01-01.md`
- `KnowledgeBaseOptimization-2026-01-01.md`
- `UnifiedArchive-2026-01-01.md`

---

## COME USARE QUESTO PIANO

1. **Inizia dal task 1.01** - Mai saltare
2. **Segui l'ordine delle fasi** - Le dipendenze sono gia calcolate
3. **Consulta i reference** per dettagli implementativi specifici
4. **Esegui verifiche** dopo ogni task
5. **Chiama Thor** per review
6. **Commit** con formato corretto
7. **Aggiorna questo file** marcando il task completato
8. **Passa al task successivo**

---

**Versione**: 2.0
**Creato**: 2026-01-01
**Riorganizzato**: 2026-01-01
**Autore**: Claude Opus 4.5
**Branch**: development
