# Technical Debt & Open Issues Backlog

**Data**: 2026-01-02
**Consolidato da**: issuesDec31.md, Jan12026.md
**Tipo**: Backlog tecnico consolidato

---

## Executive Summary

Task aperti consolidati da due report precedenti:
- **5 GitHub Issues** ancora da implementare
- **13 action items** dall'architecture review
- **4 fasi** di priorità

---

## 1. GitHub Issues Aperti

### #57 - Parent Dashboard UI/UX (v2.1)
**Priorità**: Media | **Target**: v2.1

- [ ] "Genitori" in main navigation sidebar
- [ ] Visual indicator per nuovi insights
- [ ] Route alias `/genitori`
- [ ] Consent status indicator in header
- [ ] Mobile responsiveness improvements
- [ ] Filtering/search per insights
- [ ] Export format selection UI
- [ ] Weekly summary email option

### #49 - Calendar Sync (ClasseViva + Google Classroom)
**Priorità**: Bassa | **Target**: Future

- [ ] Research API ClasseViva/Spaggiari
- [ ] Research Google Classroom API
- [ ] Creare modelli Prisma: CalendarSync, SyncedEvent
- [ ] Implementare API routes

### #38 - Tool Buttons Bar
**Priorità**: Media | **Target**: v1.1

- [ ] Creare `ToolButtonsBar` component
- [ ] Integrare nella conversation UI
- [ ] Quick access a: mindmap, quiz, flashcard, demo

### #21 - PDF Upload and Processing
**Priorità**: Alta | **Target**: v1.1

- [ ] `/api/upload` route per PDF
- [ ] PDF processing con pdf.js
- [ ] Integrazione con Materials
- [ ] Collegamento con Study Kit Generator

### #16 - Technical Support Assistant
**Priorità**: Bassa | **Target**: v2.0

- [ ] Support chatbot implementation
- [ ] Documentation knowledge base
- [ ] FAQ system

---

## 2. Architecture Action Items

### Phase 1: Critical Fixes (Priorità ALTA)

| Task | File | Note |
|------|------|------|
| [ ] Fix 2 failing unit tests | `mastery.test.ts` | Mock fetch invece di localStorage |
| [ ] Add alt props (a11y) | `mindmaps-view.tsx:504,508` | WCAG violation |
| [ ] Commit untracked file | `use-saved-materials.ts` | Issue #64 |
| [ ] Remove unused imports | Test files vari | ESLint warnings |

### Phase 2: Component Refactoring (Priorità MEDIA)

| Task | File | Lines | Target |
|------|------|-------|--------|
| [ ] Split settings | `settings-view.tsx` | 3649 | max 500/component |
| [ ] Extract components | `conversation-flow.tsx` | 1281 | CharacterSelector, MessageList, InputArea |
| [ ] Extract components | `archive-view.tsx` | 1096 | FilterBar, MaterialCard, DeleteDialog |

### Phase 3: Testing & CI (Priorità MEDIA)

| Task | Note |
|------|------|
| [ ] Add unit tests to CI | `npm run test:unit` in pipeline |
| [ ] Tests for use-saved-materials.ts | Hook non testato |
| [ ] Add `/api/health` endpoint | Health check mancante |

### Phase 4: Production Hardening (Priorità MEDIA)

| Task | Location | Note |
|------|----------|------|
| [ ] Rate limiting | `/api/chat`, `/api/realtime/token` | Prevenire abuse |
| [ ] Voice fallback | Voice session | Graceful degradation to text |
| [ ] CORS review | API routes | Documentare config produzione |
| [ ] Token budget enforcement | AI providers | budgetLimit non verificato |

---

## 3. Technical Debt Items

### Performance
- [ ] Connection pooling per database
- [ ] Caching layer per maestri list, settings

### Reliability
- [ ] Consistent error propagation (no silent failures)
- [ ] Retry logic per transient failures

### Code Quality (ESLint Warnings)

| File | Issue |
|------|-------|
| `collaborator-avatars.tsx:133` | Use next/image instead of img |
| `intent-detection.test.ts:21,22` | Unused imports |
| `content-filter.test.ts:22-24` | Unused imports |
| `mindmap-export.test.ts:6,10` | Unused imports |
| `mindmap-handler.test.ts:26` | Unused import |
| `quiz-handler.test.ts:23` | Unused import |

---

## 4. Ordine di Esecuzione Consigliato

```
Week 1: Phase 1 (Critical Fixes)
   └── Prerequisito per merge stabile

Week 2-3: Phase 2 (Refactoring)
   └── Migliora maintainability

Week 4: Phase 3 (Testing)
   └── Aumenta confidence

Ongoing: Phase 4 + GitHub Issues
   └── Production hardening + features
```

---

## 5. Note

- I 14 GitHub issues completati sono stati chiusi (Dec 31 report)
- Questo backlog sostituisce issuesDec31.md e Jan12026.md
- Aggiornare questo file man mano che i task vengono completati

---

## 6. Verification Commands

```bash
npm run lint          # Target: 0 warnings
npm run typecheck     # Must pass
npm run test:unit     # Target: 0 failures
npm run build         # Must pass
```

---

*Consolidato: 2 Gennaio 2026*
