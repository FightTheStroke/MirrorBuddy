# Technical Debt & Open Issues Backlog

**Data**: 2026-01-02
**Consolidato da**: issuesDec31.md, Jan12026.md
**Tipo**: Backlog tecnico consolidato
**Status**: ARCHIVED - Incorporato in MasterPlan-v2.1-2026-01-02.md

---

## ARCHIVAL NOTE (2026-01-02)

Questo documento è stato archiviato. Il contenuto residuo (non completato) è stato
trasferito a: `docs/plans/doing/MasterPlan-v2.1-2026-01-02.md` (WAVE 3: Tech Debt Residuo)

---

## 1. GitHub Issues - STATUS FINALE

| Issue | Titolo | Status | Note |
|-------|--------|--------|------|
| #57 | Parent Dashboard UI/UX | CLOSED | Implementato |
| #49 | Calendar Sync | OPEN | Trasferito a Master Plan WAVE 4 (Future) |
| #38 | Tool Buttons Bar | CLOSED | Implementato |
| #21 | PDF Upload and Processing | CLOSED | Implementato (`src/lib/pdf/pdf-processor.ts`) |
| #16 | Technical Support Assistant | CLOSED | Implementato |

---

## 2. Architecture Action Items - STATUS FINALE

### Phase 1: Critical Fixes - COMPLETATO

| Task | Status | Verifica |
|------|--------|----------|
| Fix failing unit tests | DONE | 1945 tests passing (2026-01-02) |
| Add alt props (a11y) | DONE | ESLint 0 warnings |
| Commit untracked file | DONE | `use-saved-materials.ts` tracked |
| Remove unused imports | DONE | ESLint 0 warnings |

### Phase 2: Component Refactoring - TRASFERITO

| Task | File | Status | Destinazione |
|------|------|--------|--------------|
| Split settings | `settings-view.tsx` | PENDING | Master Plan WAVE 3.1 |
| Extract components | `conversation-flow.tsx` | PENDING | Master Plan WAVE 3.1 |
| Extract components | `archive-view.tsx` | PENDING | Master Plan WAVE 3.1 |

### Phase 3: Testing & CI - PARZIALE

| Task | Status | Destinazione |
|------|--------|--------------|
| Add unit tests to CI | PENDING | Master Plan WAVE 3.2 |
| Tests for use-saved-materials.ts | PENDING | Master Plan WAVE 3.2 |
| Add `/api/health` endpoint | PENDING | Master Plan WAVE 3.2 |

### Phase 4: Production Hardening - TRASFERITO

| Task | Status | Destinazione |
|------|--------|--------------|
| Rate limiting | PENDING | Master Plan WAVE 3.2 |
| Voice fallback | PENDING | Master Plan WAVE 3.2 |
| CORS review | PENDING | Master Plan WAVE 3.2 |
| Token budget enforcement | PENDING | Master Plan WAVE 3.2 |

---

## 3. Technical Debt Items - STATUS FINALE

### Performance - TRASFERITO a Master Plan WAVE 3.3
- [ ] Connection pooling per database
- [ ] Caching layer per maestri list, settings

### Reliability - TRASFERITO a Master Plan WAVE 3.2
- [ ] Consistent error propagation
- [ ] Retry logic per transient failures

### Code Quality - COMPLETATO
ESLint 0 warnings (verificato 2026-01-02)

---

## 4. Verification (2026-01-02)

```bash
$ npm run lint
> 0 warnings

$ npm run test:unit
> 63 test files, 1945 tests passed

$ npm run typecheck
> No errors

$ npm run build
> Build successful
```

---

## 5. Riferimenti

- **Successore**: `docs/plans/doing/MasterPlan-v2.1-2026-01-02.md`
- **Documenti originali**: issuesDec31.md, Jan12026.md (ora obsoleti)

---

*Archiviato: 2 Gennaio 2026*
*Autore: Claude Opus 4.5*
