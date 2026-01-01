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

## SEQUENZA PIANI (in ordine di dipendenza)

| # | Piano | Tasks | Priorita | Motivo Ordine |
|---|-------|-------|----------|---------------|
| 1 | MindmapDataStructureFix | 14 | P0 | Bug critici, blocca tutto |
| 2 | ConversationalMemoryInjection | 13 | P0 | Indipendente, feature core |
| 3 | ToolFocusModeSelection | 12 | P1 | Dipende da views stabili |
| 4 | KnowledgeBaseOptimization | 22 | P1 | Documentazione, ottimizzazione |
| 5 | UnifiedArchive (Knowledge Hub) | 50 | P2 | Dipende da tutto, va ultimo |

**TOTALE: 111 tasks**

---

## PIANO 1: MindmapDataStructureFix

**Riferimento**: `docs/plans/reference/MindmapDataStructureFix-2026-01-01.md`
**Obiettivo**: Fixare 4 bug critici mindmap (undefined title, flat structure, coach confusion, missing instructions)

### Tasks

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 1.01 | Create mindmap-utils.ts with conversion functions | `src/lib/tools/mindmap-utils.ts` | | |
| 1.02 | Fix mindmap-handler.ts: use 'title' field | `src/lib/tools/handlers/mindmap-handler.ts` | | |
| 1.03 | Fix markmap-renderer.tsx: use markdown or convert nodes | `src/components/tools/markmap-renderer.tsx` | | |
| 1.04 | Fix mindmaps-view.tsx: pass markdown, use title | `src/components/education/mindmaps-view.tsx` | | |
| 1.05 | Fix use-saved-materials.ts: map topic->title | `src/lib/hooks/use-saved-materials.ts` | | |
| 1.06 | Update voice-tool-commands.ts: add hierarchy examples | `src/lib/voice/voice-tool-commands.ts` | | |
| 1.07 | Update chat route: ensure content with tool calls | `src/app/api/chat/route.ts` | | |
| 1.08 | Update types in tools.ts | `src/types/tools.ts` | | |
| 1.09 | Unit tests for mindmap-utils.ts | `src/lib/tools/__tests__/mindmap-utils.test.ts` | | |
| 1.10 | Update mindmap-handler.test.ts | `src/lib/tools/handlers/__tests__/mindmap-handler.test.ts` | | |
| 1.11 | E2E test mindmap-hierarchy.spec.ts | `e2e/mindmap-hierarchy.spec.ts` | | |
| 1.12 | Run full verification suite | - | | |
| 1.13 | Manual test checklist | - | | |
| 1.14 | Update CHANGELOG | `CHANGELOG.md` | | |

---

## PIANO 2: ConversationalMemoryInjection

**Riferimento**: `docs/plans/reference/ConversationalMemoryInjection-2026-01-01.md`
**Obiettivo**: I Maestri ricordano le conversazioni precedenti

### Tasks

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 2.01 | Create memory-loader.ts | `src/lib/conversation/memory-loader.ts` | | |
| 2.02 | Create prompt-enhancer.ts | `src/lib/conversation/prompt-enhancer.ts` | | |
| 2.03 | Unit tests memory-loader | `src/lib/conversation/__tests__/memory-loader.test.ts` | | |
| 2.04 | Unit tests prompt-enhancer | `src/lib/conversation/__tests__/prompt-enhancer.test.ts` | | |
| 2.05 | Add API endpoint /api/conversations/memory | `src/app/api/conversations/memory/route.ts` | | |
| 2.06 | Modify conversation-flow-store.ts | `src/lib/stores/conversation-flow-store.ts` | | |
| 2.07 | Verify conversation-flow.tsx uses enhanced prompt | `src/components/conversation/conversation-flow.tsx` | | |
| 2.08 | Integration test memory flow | `src/lib/conversation/__tests__/memory-integration.test.ts` | | |
| 2.09 | Manual E2E test checklist | - | | |
| 2.10 | Create ADR 0021 for memory injection | `docs/adr/0021-conversational-memory-injection.md` | | |
| 2.11 | Update CHANGELOG | `CHANGELOG.md` | | |
| 2.12 | Create conversation-memory.md docs | `docs/claude/conversation-memory.md` | | |
| 2.13 | Run full verification suite | - | | |

---

## PIANO 3: ToolFocusModeSelection

**Riferimento**: `docs/plans/reference/ToolFocusModeSelection-2026-01-01.md`
**Obiettivo**: Dialog 3-step prima del focus mode (materia -> maestro -> modalita)

### Tasks

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 3.01 | Add focusInteractionMode to app-store.ts | `src/lib/stores/app-store.ts` | | |
| 3.02 | Create ToolMaestroSelectionDialog component | `src/components/education/tool-maestro-selection-dialog.tsx` | | |
| 3.03 | Update summaries-view.tsx with dialog | `src/components/education/summaries-view.tsx` | | |
| 3.04 | Update mindmaps-view.tsx with dialog | `src/components/education/mindmaps-view.tsx` | | |
| 3.05 | Update flashcards-view.tsx with dialog | `src/components/education/flashcards-view.tsx` | | |
| 3.06 | Update quiz-view.tsx with dialog | `src/components/education/quiz-view.tsx` | | |
| 3.07 | Add voice integration to focus-tool-layout.tsx | `src/components/tools/focus-tool-layout.tsx` | | |
| 3.08 | Unit tests for ToolMaestroSelectionDialog | `src/components/education/__tests__/tool-maestro-selection-dialog.test.tsx` | | |
| 3.09 | Unit tests for app-store changes | `src/lib/stores/__tests__/app-store.test.ts` | | |
| 3.10 | Manual test: all 5 flows | - | | |
| 3.11 | Update CHANGELOG | `CHANGELOG.md` | | |
| 3.12 | Run full verification suite | - | | |

---

## PIANO 4: KnowledgeBaseOptimization

**Riferimento**: `docs/plans/reference/KnowledgeBaseOptimization-2026-01-01.md`
**Obiettivo**: Ottimizzare knowledge base, creare ARCHITECTURE.md, aggiornare release manager

### Phase 4.1: Discovery

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 4.01 | Inventory all features from codebase | - | | |
| 4.02 | Collect all ADRs summaries | - | | |
| 4.03 | Map component structure | - | | |
| 4.04 | Identify all AI integrations | - | | |

### Phase 4.2: Optimize Knowledge Base

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 4.05 | Create feature index for quick lookup | `src/lib/ai/app-knowledge-base-v2.ts` | | |
| 4.06 | Implement lazy retrieval function | `src/lib/ai/app-knowledge-base-v2.ts` | | |
| 4.07 | Update support-teachers.ts to use v2 | `src/lib/ai/support-teachers.ts` | | |
| 4.08 | Unit tests for knowledge base v2 | `src/lib/ai/__tests__/app-knowledge-base-v2.test.ts` | | |
| 4.09 | Test with coach integration | - | | |

### Phase 4.3: Create ARCHITECTURE.md

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 4.10 | Document all 17 Maestri | `docs/ARCHITECTURE.md` | | |
| 4.11 | Document Triangle of Support | `docs/ARCHITECTURE.md` | | |
| 4.12 | Document all tools | `docs/ARCHITECTURE.md` | | |
| 4.13 | Document gamification | `docs/ARCHITECTURE.md` | | |
| 4.14 | Document accessibility | `docs/ARCHITECTURE.md` | | |
| 4.15 | Document audio system | `docs/ARCHITECTURE.md` | | |
| 4.16 | Document GDPR/parent dashboard | `docs/ARCHITECTURE.md` | | |
| 4.17 | Document state management | `docs/ARCHITECTURE.md` | | |
| 4.18 | Document AI providers | `docs/ARCHITECTURE.md` | | |

### Phase 4.4: Update Release Manager

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 4.19 | Add WCAG 2.1 AA checks | `.claude/agents/app-release-manager.md` | | |
| 4.20 | Add GDPR compliance for minors | `.claude/agents/app-release-manager.md` | | |
| 4.21 | Add AI safety guardrails validation | `.claude/agents/app-release-manager.md` | | |
| 4.22 | Add E2E educational flows | `.claude/agents/app-release-manager.md` | | |

---

## PIANO 5: UnifiedArchive (Knowledge Hub)

**Riferimento**: `docs/plans/reference/UnifiedArchive-2026-01-01.md`
**Obiettivo**: Evolvere archivio con renderers, ricerca, collections, viste, bulk actions

### Phase 5.1: Material Renderers (P0)

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 5.01 | Create renderer registry | `src/components/education/knowledge-hub/renderers/index.ts` | | |
| 5.02 | MindmapRenderer | `src/components/education/knowledge-hub/renderers/mindmap-renderer.tsx` | | |
| 5.03 | QuizRenderer | `src/components/education/knowledge-hub/renderers/quiz-renderer.tsx` | | |
| 5.04 | FlashcardRenderer | `src/components/education/knowledge-hub/renderers/flashcard-renderer.tsx` | | |
| 5.05 | SummaryRenderer | `src/components/education/knowledge-hub/renderers/summary-renderer.tsx` | | |
| 5.06 | DemoRenderer | `src/components/education/knowledge-hub/renderers/demo-renderer.tsx` | | |
| 5.07 | DiagramRenderer (Mermaid) | `src/components/education/knowledge-hub/renderers/diagram-renderer.tsx` | | |
| 5.08 | TimelineRenderer | `src/components/education/knowledge-hub/renderers/timeline-renderer.tsx` | | |
| 5.09 | FormulaRenderer (KaTeX) | `src/components/education/knowledge-hub/renderers/formula-renderer.tsx` | | |
| 5.10 | ChartRenderer | `src/components/education/knowledge-hub/renderers/chart-renderer.tsx` | | |
| 5.11 | ImageRenderer | `src/components/education/knowledge-hub/renderers/image-renderer.tsx` | | |
| 5.12 | PdfRenderer | `src/components/education/knowledge-hub/renderers/pdf-renderer.tsx` | | |
| 5.13 | HomeworkRenderer | `src/components/education/knowledge-hub/renderers/homework-renderer.tsx` | | |
| 5.14 | Update MaterialViewer to use registry | `src/components/education/archive/material-viewer.tsx` | | |
| 5.15 | Quick Actions component | `src/components/education/knowledge-hub/components/quick-actions.tsx` | | |
| 5.16 | Unit tests for all renderers | `src/components/education/knowledge-hub/renderers/__tests__/` | | |

### Phase 5.2: Full-Text Search (P1)

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 5.17 | Install fuse.js | `package.json` | | |
| 5.18 | Create searchable-text.ts | `src/lib/search/searchable-text.ts` | | |
| 5.19 | Add searchableText to Prisma schema | `prisma/schema.prisma` | | |
| 5.20 | Update Material API to save searchableText | `src/app/api/materials/route.ts` | | |
| 5.21 | Create useMaterialsSearch hook | `src/components/education/knowledge-hub/hooks/use-materials-search.ts` | | |
| 5.22 | Create SearchBar component | `src/components/education/knowledge-hub/components/search-bar.tsx` | | |
| 5.23 | Update archive-view.tsx with new search | `src/components/education/archive-view.tsx` | | |
| 5.24 | Create backfill-searchable.ts script | `scripts/backfill-searchable.ts` | | |
| 5.25 | Run backfill script | - | | |
| 5.26 | Unit tests for search | `src/lib/search/__tests__/searchable-text.test.ts` | | |

### Phase 5.3: Collections & Tags (P1)

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 5.27 | Add Collection model to schema | `prisma/schema.prisma` | | |
| 5.28 | Add Tag, MaterialTag models | `prisma/schema.prisma` | | |
| 5.29 | Run Prisma migration | - | | |
| 5.30 | Create Collections API | `src/app/api/collections/route.ts` | | |
| 5.31 | Create Tags API | `src/app/api/tags/route.ts` | | |
| 5.32 | Update Materials API for collection/tags filter | `src/app/api/materials/route.ts` | | |
| 5.33 | Create useCollections hook | `src/components/education/knowledge-hub/hooks/use-collections.ts` | | |
| 5.34 | Create useTags hook | `src/components/education/knowledge-hub/hooks/use-tags.ts` | | |
| 5.35 | Create SidebarNavigation component | `src/components/education/knowledge-hub/components/sidebar-navigation.tsx` | | |
| 5.36 | Create useSmartCollections hook | `src/components/education/knowledge-hub/hooks/use-smart-collections.ts` | | |
| 5.37 | Add drag & drop to material-card | `src/components/education/knowledge-hub/components/material-card.tsx` | | |
| 5.38 | Unit tests for collections/tags | `src/components/education/knowledge-hub/hooks/__tests__/` | | |

### Phase 5.4: Alternative Views (P2)

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 5.39 | Install react-resizable-panels | `package.json` | | |
| 5.40 | Create ExplorerView | `src/components/education/knowledge-hub/views/explorer-view.tsx` | | |
| 5.41 | Create GalleryView | `src/components/education/knowledge-hub/views/gallery-view.tsx` | | |
| 5.42 | Create TimelineView | `src/components/education/knowledge-hub/views/timeline-view.tsx` | | |
| 5.43 | Create CalendarView | `src/components/education/knowledge-hub/views/calendar-view.tsx` | | |
| 5.44 | Add view switcher to knowledge-hub.tsx | `src/components/education/knowledge-hub/knowledge-hub.tsx` | | |
| 5.45 | Add quick preview on hover | `src/components/education/knowledge-hub/components/material-card.tsx` | | |
| 5.46 | Unit tests for views | `src/components/education/knowledge-hub/views/__tests__/` | | |

### Phase 5.5: Bulk Actions & Stats (P2)

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 5.47 | Create useBulkActions hook | `src/components/education/knowledge-hub/hooks/use-bulk-actions.ts` | | |
| 5.48 | Create BulkToolbar component | `src/components/education/knowledge-hub/components/bulk-toolbar.tsx` | | |
| 5.49 | Create StatsPanel component | `src/components/education/knowledge-hub/components/stats-panel.tsx` | | |
| 5.50 | Create material-export.ts | `src/lib/export/material-export.ts` | | |
| 5.51 | Create bulk API endpoint | `src/app/api/materials/bulk/route.ts` | | |
| 5.52 | Unit tests for bulk/stats | `src/components/education/knowledge-hub/hooks/__tests__/use-bulk-actions.test.ts` | | |
| 5.53 | Integration tests | `e2e/knowledge-hub.spec.ts` | | |
| 5.54 | Create ADR for Knowledge Hub | `docs/adr/0022-knowledge-hub-architecture.md` | | |
| 5.55 | Update CHANGELOG | `CHANGELOG.md` | | |

---

## VERIFICHE PER OGNI TASK

**OBBLIGATORIE - NESSUNA ECCEZIONE**

Prima di marcare un task come completo:

```bash
# 1. Lint - DEVE essere 0 errori, 0 warnings
npm run lint
# Se fallisce: FIX SUBITO, non andare avanti

# 2. Typecheck - DEVE essere 0 errori
npm run typecheck
# Se fallisce: FIX SUBITO, non andare avanti

# 3. Build - DEVE passare
npm run build
# Se fallisce: FIX SUBITO, non andare avanti

# 4. Tests - TUTTI devono passare
npm run test
# Se fallisce: FIX SUBITO, non andare avanti

# 5. Thor review - DEVE approvare
# Invocare thor-quality-assurance-guardian per review del task
# Se Thor trova problemi: FIX SUBITO, non andare avanti
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

| Piano | Completati | Totale | % |
|-------|:----------:|:------:|:-:|
| 1. MindmapDataStructureFix | 0 | 14 | 0% |
| 2. ConversationalMemoryInjection | 0 | 13 | 0% |
| 3. ToolFocusModeSelection | 0 | 12 | 0% |
| 4. KnowledgeBaseOptimization | 0 | 22 | 0% |
| 5. UnifiedArchive | 0 | 50 | 0% |
| **TOTALE** | **0** | **111** | **0%** |

---

## FILE REFERENCE

I piani originali dettagliati sono in `docs/plans/reference/`:
- `MindmapDataStructureFix-2026-01-01.md`
- `ConversationalMemoryInjection-2026-01-01.md`
- `ToolFocusModeSelection-2026-01-01.md`
- `KnowledgeBaseOptimization-2026-01-01.md`
- `UnifiedArchive-2026-01-01.md`

---

## COME USARE QUESTO PIANO

1. **Inizia dal task 1.01** - Mai saltare
2. **Leggi il piano reference** per dettagli implementativi
3. **Implementa il task** seguendo le specifiche
4. **Esegui verifiche** (lint, typecheck, build, test)
5. **Chiama Thor** per review
6. **Commit** con formato corretto
7. **Aggiorna questo file** marcando il task completato
8. **Passa al task successivo**

---

**Versione**: 1.0
**Creato**: 2026-01-01
**Autore**: Claude Opus 4.5
**Branch**: development
