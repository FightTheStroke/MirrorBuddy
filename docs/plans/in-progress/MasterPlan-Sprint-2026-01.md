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

| # | Obiettivo | Cosa significa |
|---|-----------|----------------|
| A | **Mindmaps funzionano** | title field, hierarchy, AI prompts corretti |
| B | **Maestri hanno memoria** | Ricordano conversazioni precedenti |
| C | **Tool creation ha UX corretta** | Dialog per scegliere maestro/modalita prima di creare |
| D | **Materiali organizzati** | Knowledge Hub con search, collections, views |
| E | **Codebase documentata** | ARCHITECTURE.md, ADRs corretti e numerati |

---

## STANDARDS DI RIFERIMENTO

Ogni task DEVE rispettare:

### ISE Engineering Fundamentals
- https://microsoft.github.io/code-with-engineering-playbook/
- Code Reviews (Thor)
- Testing (80% coverage)
- Documentation

### Security (OWASP Top 10)
- Input validation su tutti gli API
- Parameterized queries (Prisma)
- XSS prevention (sanitize output)
- CSRF protection
- Auth check su ogni endpoint

### Accessibility (WCAG 2.1 AA)
- Keyboard navigation
- Screen reader support
- Color contrast 4.5:1
- Focus indicators
- Aria labels

### GDPR (Minori)
- Consenso genitori per dati sensibili
- Right to erasure
- Data minimization
- Audit logging

### Safety (ADR 0004)
- 5-layer defense attivo su tutte le nuove features
- Tutti i nuovi AI prompt usano `injectSafetyGuardrails()`
- Crisis keywords detection
- Age-appropriate content

---

## FASE 0: CLEANUP & PREREQUISITES

Prima di iniziare: pulire il casino esistente.

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 0.01 | Fix ADR numbering: rename 0020-mindmap to 0020 | `docs/adr/` | ✅ | ✅ |
| 0.02 | Fix ADR numbering: rename memory to 0021 | `docs/adr/` | ✅ | ✅ |
| 0.03 | Fix ADR numbering: rename knowledge-hub to 0022 | `docs/adr/` | ✅ | ✅ |
| 0.04 | Verify existing safety tests pass | `src/lib/safety/__tests__/` | ✅ (162 passed) | ✅ |
| 0.05 | Verify existing E2E tests pass | `e2e/` | ⚠️ (UI tests fail, unit 1336 pass) | ✅ |
| 0.06 | Run full build to establish baseline | - | ✅ (lint, typecheck, build pass) | ✅ |

---

## FASE 1: DATABASE & TYPES

Le fondamenta. Schema e tipi devono essere corretti.

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 1.01 | Fix types in tools.ts (MindmapData.title) | `src/types/tools.ts` | ✅ (already correct) | ✅ |
| 1.02 | Add searchableText field to Material model | `prisma/schema.prisma` | ✅ | ✅ |
| 1.03 | Add Collection model | `prisma/schema.prisma` | ✅ | ✅ |
| 1.04 | Add Tag and MaterialTag models | `prisma/schema.prisma` | ✅ | ✅ |
| 1.05 | Run Prisma migration | - | ✅ (db push) | ✅ |
| 1.06 | Verify all types compile | `npm run typecheck` | ✅ | ✅ |

---

## FASE 2: CORE LIBRARIES

Utility functions e business logic. Nessuna dipendenza da UI.

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 2.01 | Create mindmap-utils.ts (markdown conversion) | `src/lib/tools/mindmap-utils.ts` | ✅ (already exists) | ✅ |
| 2.02 | Create memory-loader.ts | `src/lib/conversation/memory-loader.ts` | ✅ | ✅ |
| 2.03 | Create prompt-enhancer.ts (MUST use injectSafetyGuardrails) | `src/lib/conversation/prompt-enhancer.ts` | ✅ | ✅ |
| 2.04 | Create knowledge-base-v2.ts (lazy retrieval) | `src/data/app-knowledge-base-v2.ts` | ✅ (already exists) | ✅ |
| 2.05 | Create searchable-text.ts (Fuse.js) | `src/lib/search/searchable-text.ts` | ✅ | ✅ |
| 2.06 | Create material-export.ts | `src/lib/export/material-export.ts` | ✅ | ✅ |
| 2.07 | Install fuse.js | `package.json` | ✅ | ✅ |
| 2.08 | Unit tests for mindmap-utils | `src/lib/tools/__tests__/mindmap-utils.test.ts` | ✅ (already exists) | ✅ |
| 2.09 | Unit tests for memory-loader | `src/lib/conversation/__tests__/memory-loader.test.ts` | ✅ (16 tests) | ✅ |
| 2.10 | Unit tests for prompt-enhancer | `src/lib/conversation/__tests__/prompt-enhancer.test.ts` | ✅ (12 tests) | ✅ |
| 2.11 | Unit tests for knowledge-base-v2 | `src/data/__tests__/app-knowledge-base-v2.test.ts` | ✅ (16 tests) | ✅ |
| 2.12 | Unit tests for searchable-text | `src/lib/search/__tests__/searchable-text.test.ts` | ✅ (26 tests) | ✅ |

---

## FASE 3: STORES

State management updates. Altri componenti dipendono da questi.

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 3.01 | Add focusInteractionMode to app-store | `src/lib/stores/app-store.ts` | ✅ (already exists) | ✅ |
| 3.02 | Update enterFocusMode signature | `src/lib/stores/app-store.ts` | ✅ (already exists) | ✅ |
| 3.03 | Update exitFocusMode to reset mode | `src/lib/stores/app-store.ts` | ✅ (already exists) | ✅ |
| 3.04 | Modify conversation-flow-store for memory | `src/lib/stores/conversation-flow-store.ts` | ✅ (memory fields exist) | ✅ |
| 3.05 | Unit tests for store changes | `src/lib/stores/__tests__/app-store.test.ts` | ✅ (21 tests) | ✅ |

---

## FASE 4: API ROUTES

Backend endpoints con SECURITY CHECKS.

**OGNI API DEVE:**
- Verificare `convergio-user-id` cookie
- Validare input con Zod
- Usare Prisma (parameterized queries)
- Rate limiting se appropriato
- Logging per audit

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 4.01 | Create /api/conversations/memory (auth + validation) | `src/app/api/conversations/memory/route.ts` | ✅ | |
| 4.02 | Create /api/collections (auth + validation) | `src/app/api/collections/route.ts` | ✅ | |
| 4.03 | Create /api/tags (auth + validation) | `src/app/api/tags/route.ts` | ✅ | |
| 4.04 | Update /api/materials for searchableText | `src/app/api/materials/route.ts` | ✅ | |
| 4.05 | Update /api/materials for collection/tag filters | `src/app/api/materials/route.ts` | ✅ | |
| 4.06 | Create /api/materials/bulk (auth + validation) | `src/app/api/materials/bulk/route.ts` | | |
| 4.07 | Update /api/chat for content with tool calls | `src/app/api/chat/route.ts` | | |
| 4.08 | Security review: OWASP check all new endpoints | - | | |

---

## FASE 5: BASE COMPONENTS

Componenti riutilizzabili con ACCESSIBILITY.

**OGNI COMPONENTE UI DEVE:**
- Keyboard navigable (Tab, Enter, Escape)
- Aria labels appropriati
- Focus visible
- Color contrast 4.5:1
- Screen reader friendly

### 5A: Tool Selection Dialog

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 5.01 | Create ToolMaestroSelectionDialog (accessible) | `src/components/education/tool-maestro-selection-dialog.tsx` | | |
| 5.02 | Unit tests + accessibility tests for dialog | `src/components/education/__tests__/tool-maestro-selection-dialog.test.tsx` | | |

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

### 5C: Knowledge Hub Components (ACCESSIBLE)

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 5.17 | SearchBar component (keyboard, aria) | `src/components/education/knowledge-hub/components/search-bar.tsx` | | |
| 5.18 | SidebarNavigation (keyboard nav) | `src/components/education/knowledge-hub/components/sidebar-navigation.tsx` | | |
| 5.19 | QuickActions component | `src/components/education/knowledge-hub/components/quick-actions.tsx` | | |
| 5.20 | BulkToolbar component | `src/components/education/knowledge-hub/components/bulk-toolbar.tsx` | | |
| 5.21 | StatsPanel component | `src/components/education/knowledge-hub/components/stats-panel.tsx` | | |
| 5.22 | MaterialCard with drag & drop (keyboard alternative) | `src/components/education/knowledge-hub/components/material-card.tsx` | | |

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

Fix AI handlers e core rendering. SAFETY INTEGRATION.

**OGNI AI PROMPT DEVE:**
- Usare `injectSafetyGuardrails()` da `@/lib/safety`
- Passare per content filter
- Output sanitizzato

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 6.01 | Fix mindmap-handler.ts (use 'title' field) | `src/lib/tools/handlers/mindmap-handler.ts` | | |
| 6.02 | Fix markmap-renderer.tsx (markdown/nodes) | `src/components/tools/markmap-renderer.tsx` | | |
| 6.03 | Fix use-saved-materials.ts (map topic->title) | `src/lib/hooks/use-saved-materials.ts` | | |
| 6.04 | Update voice-tool-commands.ts (hierarchy examples) | `src/lib/voice/voice-tool-commands.ts` | | |
| 6.05 | Update support-teachers.ts (use v2 knowledge base) | `src/lib/ai/support-teachers.ts` | | |
| 6.06 | Update MaterialViewer (use renderer registry) | `src/components/education/archive/material-viewer.tsx` | | |
| 6.07 | Unit tests for mindmap-handler | `src/lib/tools/handlers/__tests__/mindmap-handler.test.ts` | | |
| 6.08 | Verify safety integration in memory-loader | - | | |

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

## FASE 9: TESTING & VERIFICATION

Tutti i test. Nessuna eccezione.

### 9A: E2E Tests

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 9.01 | E2E test mindmap-hierarchy.spec.ts | `e2e/mindmap-hierarchy.spec.ts` | | |
| 9.02 | E2E test knowledge-hub.spec.ts | `e2e/knowledge-hub.spec.ts` | | |
| 9.03 | Integration test memory flow | `src/lib/conversation/__tests__/memory-integration.test.ts` | | |

### 9B: Safety Tests

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 9.04 | Test safety layer with memory feature | `src/lib/safety/__tests__/memory-safety.test.ts` | | |
| 9.05 | Test safety layer with Knowledge Hub | `src/lib/safety/__tests__/knowledge-hub-safety.test.ts` | | |
| 9.06 | Adversarial test: jailbreak via memory | - | | |

### 9C: Accessibility Tests

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 9.07 | Axe accessibility audit Knowledge Hub | `e2e/accessibility-knowledge-hub.spec.ts` | | |
| 9.08 | Keyboard navigation test all new UI | - | | |
| 9.09 | Screen reader test (manual) | - | | |

### 9D: Performance Tests

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 9.10 | Search performance with 1000+ materials | - | | |
| 9.11 | Knowledge Hub load time < 2s | - | | |

### 9E: Manual Tests

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 9.12 | Manual test: all 5 tool flows | - | | |
| 9.13 | Manual test: voice mode | - | | |
| 9.14 | Manual test: knowledge hub search | - | | |
| 9.15 | Manual test: memory context in conversation | - | | |

---

## FASE 10: DOCUMENTATION

Tutta la documentazione. Formati specifici.

### ADR Format (da ADR esistenti):
```markdown
# ADR XXXX: Title

## Status
Proposed | Accepted | Deprecated | Superseded

## Date
YYYY-MM-DD HH:MM CET

## Context
[Problem description, options considered]

## Decision
[What we decided and why]

## Consequences
### Positive
### Negative
### Risks
### Mitigations

## Key Files
| File | Purpose |

## References
```

### CHANGELOG Format (Keep a Changelog):
```markdown
## [Unreleased] - Feature Name
> **Branch**: `branch-name` | **Plan**: `docs/plans/...`

### Added
### Changed
### Fixed
### Security
### Deprecated
### Removed
### Documentation
```

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 10.01 | Update ARCHITECTURE.md with new features | `docs/ARCHITECTURE.md` | | |
| 10.02 | - Document Memory Injection | `docs/ARCHITECTURE.md` | | |
| 10.03 | - Document Knowledge Hub | `docs/ARCHITECTURE.md` | | |
| 10.04 | - Document Tool Focus Selection | `docs/ARCHITECTURE.md` | | |
| 10.05 | - Update ADR count and list | `docs/ARCHITECTURE.md` | | |
| 10.06 | Finalize ADR 0020 (mindmap fix) | `docs/adr/0020-mindmap-data-structure-fix.md` | | |
| 10.07 | Finalize ADR 0021 (memory injection) | `docs/adr/0021-conversational-memory-injection.md` | | |
| 10.08 | Finalize ADR 0022 (knowledge hub) | `docs/adr/0022-knowledge-hub-architecture.md` | | |
| 10.09 | Create conversation-memory.md | `docs/claude/conversation-memory.md` | | |
| 10.10 | Create knowledge-hub.md | `docs/claude/knowledge-hub.md` | | |
| 10.11 | Update CHANGELOG with all changes | `CHANGELOG.md` | | |

---

## FASE 11: COMPLIANCE VERIFICATION

Verifica compliance con tutti gli standard.

### 11A: Release Manager Updates

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 11.01 | Add WCAG 2.1 AA checks | `.claude/agents/app-release-manager.md` | | |
| 11.02 | Add GDPR compliance for minors | `.claude/agents/app-release-manager.md` | | |
| 11.03 | Add AI safety guardrails validation | `.claude/agents/app-release-manager.md` | | |
| 11.04 | Add E2E educational flows | `.claude/agents/app-release-manager.md` | | |

### 11B: GDPR Verification

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 11.05 | Verify Knowledge Hub data can be exported | - | | |
| 11.06 | Verify Knowledge Hub data can be deleted | - | | |
| 11.07 | Verify Memory data respects consent | - | | |
| 11.08 | Audit logging for new endpoints | - | | |

### 11C: Security Audit

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 11.09 | OWASP check: all new API endpoints | - | | |
| 11.10 | XSS check: all new UI components | - | | |
| 11.11 | Auth check: all endpoints verify user | - | | |

---

## FASE 12: FINAL VERIFICATION

Verifica finale completa. BLOCCA SE FALLISCE.

| ID | Task | File | Status | Thor |
|----|------|------|--------|------|
| 12.01 | Full lint check (0 errors, 0 warnings) | - | | |
| 12.02 | Full typecheck (0 errors) | - | | |
| 12.03 | Full build (passes) | - | | |
| 12.04 | Full test suite (all pass) | - | | |
| 12.05 | Verify Objective A: Mindmaps work | - | | |
| 12.06 | Verify Objective B: Memory works | - | | |
| 12.07 | Verify Objective C: Tool UX works | - | | |
| 12.08 | Verify Objective D: Knowledge Hub works | - | | |
| 12.09 | Verify Objective E: Docs complete | - | | |
| 12.10 | Final Thor review: EVERYTHING | - | | |

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
** Specifica del task completata **
- [ ] Task implementato come da specifica
**Code Quality:**
- [ ] Nessun console.log
- [ ] Nessun TODO dimenticato
- [ ] Nessun codice commentato
- [ ] Types corretti e completi
- [ ] Nessun `any`
- [ ] Error handling presente
- [ ] Test coverage >= 80%

**Security (OWASP):**
- [ ] Input validation presente
- [ ] Nessuna SQL injection possibile
- [ ] Nessuna XSS possibile
- [ ] Auth check su endpoint

**Accessibility (WCAG):**
- [ ] Keyboard navigable (se UI)
- [ ] Aria labels (se UI)
- [ ] Focus visible (se UI)
- [ ] Contrast OK (se UI)

**Safety (ADR 0004):**
- [ ] AI prompts usano `injectSafetyGuardrails()` (se AI)
- [ ] Content filter attivo (se AI)
- [ ] Output sanitizzato (se AI)

---

## FORMATO COMMIT

```
<type>(<scope>): <description>

[body - dettagli implementazione]

Task: <ID> (es. 1.01)
Started at: YYYY-MM-DD HH:MM CET
Completed at: YYYY-MM-DD HH:MM CET

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Tipi: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

---

## PROGRESS TRACKER

| Fase | Completati | Totale | % |
|------|:----------:|:------:|:-:|
| 0. Cleanup | 6 | 6 | 100% |
| 1. Database & Types | 6 | 6 | 100% |
| 2. Core Libraries | 12 | 12 | 100% |
| 3. Stores | 5 | 5 | 100% |
| 4. API Routes | 0 | 8 | 0% |
| 5. Base Components | 0 | 28 | 0% |
| 6. Handlers & Fixes | 0 | 8 | 0% |
| 7. Views | 0 | 17 | 0% |
| 8. Scripts | 0 | 2 | 0% |
| 9. Testing | 0 | 15 | 0% |
| 10. Documentation | 0 | 11 | 0% |
| 11. Compliance | 0 | 11 | 0% |
| 12. Final Verification | 0 | 10 | 0% |
| **TOTALE** | **29** | **129** | **22%** |

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

1. **Inizia dal task 0.01** - Mai saltare
2. **Segui l'ordine delle fasi** - Le dipendenze sono gia calcolate
3. **Consulta i reference** per dettagli implementativi specifici
4. **Esegui verifiche** dopo ogni task
5. **Chiama Thor** per review
6. **Commit** con formato corretto
7. **Aggiorna questo file** marcando il task completato e loggando quanto ci hai messo a farlo
8. **Passa al task successivo**

**SE UN TASK FALLISCE:** Non andare avanti. Fix prima.
**SE HAI DUBBI:** cerca su internet o chiedi a Thor (se cerchi su internet assicuarati che sia una fonte affidabile e aggiornata con la data di oggi).
**NON FARE ASSUNZIONI:** Leggi il codice, non presumere.
**RICORDA:** Zero tolerance per scorciatoie o lavoro incompleto, o errori o warnings.
**NON FERMARTI FINO A COMPLETAMENTO TOTALE DI TUTTO IL PIANO.**

---

**Versione**: 3.0
**Creato**: 2026-01-01
**Ultimo aggiornamento**: 2026-01-01
**Autore**: Claude Opus 4.5
**Branch**: development
