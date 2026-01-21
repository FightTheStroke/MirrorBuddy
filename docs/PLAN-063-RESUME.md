# Piano 063 - RESUME Instructions

**Status**: IN PROGRESS (16/25 tasks completati, 64%)
**Branch**: `feature/admin-theme-mobile-ux`
**Worktree**: `/Users/roberdan/GitHub/MirrorBuddy-admin-theme-mobile-ux`
**Last Commit**: `d25f5945` - Mobile header + chat fixes

---

## Come Riprendere in un Claude Fresco

### 1. Verifica Contesto

```bash
# Controlla che sei nel worktree corretto
cd /Users/roberdan/GitHub/MirrorBuddy-admin-theme-mobile-ux
git branch --show-current  # Deve essere: feature/admin-theme-mobile-ux
git status                 # Deve essere clean

# Verifica piano in dashboard
sqlite3 ~/.claude/data/dashboard.db "SELECT id, name, status, tasks_done, tasks_total FROM plans WHERE id=63;"
# Output atteso: 63|AdminTheme-TestIsolation-MobileUX|doing|16|25
```

### 2. Comando Resume

```bash
# In Claude fresco, esegui:
/execute 63 --worktree /Users/roberdan/GitHub/MirrorBuddy-admin-theme-mobile-ux

# Oppure manuale:
# "Riprendi l'esecuzione del piano 63 dal worktree feature/admin-theme-mobile-ux.
#  Sono stati completati 16/25 task. Continua con i task pending di W4 e W5."
```

### 3. Istruzioni Specifiche per il Resume

**Non fare**:

- NON creare nuovo worktree (esiste già)
- NON rifare task già done (W1, W2, W3 parziale)
- NON toccare il main branch
- NON ri-applicare migrazioni database

**Fai**:

- ✓ Parti da W4 task pending (T4-03, T4-05, T4-06, T4-07)
- ✓ Usa il worktree esistente per tutti i commit
- ✓ Consulta i report già creati:
  - `docs/admin-ui-audit-report.md`
  - `docs/mobile-ux-audit-report.md`
  - `docs/voice-mobile-investigation-report.md`
- ✓ Esegui Thor validation dopo ogni wave
- ✓ Crea PR al termine di tutto

---

## Stato Attuale per Wave

### ✅ W1: Test Data Isolation (6/6) - COMPLETATA

**Status**: Thor PASS (lint, typecheck, build)

| Task                           | Status | Commit  |
| ------------------------------ | ------ | ------- |
| T1-01: isTestData schema       | DONE   | ee0d9ee |
| T1-02: Protected users env var | DONE   | 39d2704 |
| T1-03: Cleanup script          | DONE   | -       |
| T1-04: Statistics queries      | DONE   | -       |
| T1-05: Environment guard       | DONE   | -       |
| T1-06: Test cleanup hooks      | DONE   | -       |

**Deliverables**:

- ✓ ADR 0065: Test Data Isolation Strategy
- ✓ Migration: `20260121030000_add_is_test_data_flag`
- ✓ Helper: `src/lib/test-isolation/protected-users.ts`
- ✓ Script: `scripts/cleanup-test-data.ts`
- ✓ E2E helpers: `e2e/helpers/test-data.ts`

---

### ✅ W2: Admin UI Theming (4/4) - COMPLETATA

**Status**: Thor PASS

| Task                             | Status | Commit  |
| -------------------------------- | ------ | ------- |
| T2-01: Audit report              | DONE   | -       |
| T2-02: Migrate shared components | DONE   | -       |
| T2-03: Tailwind utilities        | DONE   | -       |
| T2-04: Visual regression tests   | DONE   | 3309bf4 |

**Deliverables**:

- ✓ Report: `docs/admin-ui-audit-report.md`
- ✓ Components: `@/components/ui/table.tsx`, `status-badge.tsx`
- ✓ 110+ colors replaced with semantic tokens
- ✓ Visual regression tests: `e2e/admin-visual-regression-*.spec.ts`

---

### ⚠️ W3: Mobile Voice (3/4) - PARZIALE

**Status**: Thor PASS, 1 task blocked

| Task                        | Status      | Note                         |
| --------------------------- | ----------- | ---------------------------- |
| T3-01: Voice logging        | DONE        | -                            |
| T3-02: Investigation report | DONE        | -                            |
| T3-03: iOS fixes            | DONE        | -                            |
| T3-04: iPhone real test     | **BLOCKED** | Richiede test manuale utente |

**Deliverables**:

- ✓ Logging: `src/lib/hooks/voice-session/voice-error-logger.ts`
- ✓ Report: `docs/voice-mobile-investigation-report.md` (29KB)
- ✓ Fixes: AudioContext, constraints, timeout
- ⚠️ **T3-04 BLOCCATO**: Utente deve testare su iPhone reale usando `docs/voice-iphone-testing-checklist.md`

**Azione richiesta**: Chiedere all'utente se ha testato la voce su iPhone prima di chiudere W3.

---

### 🔄 W4: Mobile UX (3/7) - IN CORSO

**Status**: 3 done, 4 pending

| Task                       | Status      | Priority | Note                             |
| -------------------------- | ----------- | -------- | -------------------------------- |
| T4-01: Audit report        | DONE        | P1       | `docs/mobile-ux-audit-report.md` |
| T4-02: Header mobile       | DONE        | P2       | d25f5945                         |
| T4-03: Sidebar collapsible | **PENDING** | P2       | Fix prossimo                     |
| T4-04: Chat usability      | DONE        | P1       | d25f5945                         |
| T4-05: Tools mobile        | **PENDING** | P2       | -                                |
| T4-06: Voice controls size | **PENDING** | P2       | -                                |
| T4-07: Touch targets check | **PENDING** | P2       | -                                |

**Next**: Eseguire T4-03, T4-05, T4-06, T4-07 in sequenza.

**Fixes già implementati**:

- ✓ Chat input: 3 righe (120px)
- ✓ Safe area insets per keyboard iOS
- ✓ Touch targets 44px (WCAG 2.5.5)
- ✓ Header stats badges su mobile
- ✓ Hamburger menu 44px

---

### 📝 W5: Mobile Tests (0/4) - NON INIZIATA

**Status**: Tutti pending

| Task                                    | Status  | Prerequisito  |
| --------------------------------------- | ------- | ------------- |
| T5-01: Playwright mobile infrastructure | PENDING | W4 completata |
| T5-02: iPhone SE/13 tests               | PENDING | W4 + T5-01    |
| T5-03: Android Pixel 7 tests            | PENDING | W4 + T5-01    |
| T5-04: iPad tests                       | PENDING | W4 + T5-01    |

**Azione**: Iniziare solo dopo W4 completata.

---

## Risorse per Resume

### Report già creati (non rifare):

```
docs/admin-ui-audit-report.md (700+ lines)
docs/mobile-ux-audit-report.md (536 lines, 32 issues)
docs/voice-mobile-investigation-report.md (29KB, 5 root causes)
docs/voice-iphone-testing-checklist.md (testing guide)
docs/adr/0065-test-data-isolation-strategy.md (ADR)
```

### Task già implementati (non rifare):

- Schema migrations (2 files in `prisma/migrations/`)
- Test helpers (`e2e/helpers/`)
- Admin components (`@/components/ui/table.tsx`, `status-badge.tsx`)
- Voice logging (`src/lib/hooks/voice-session/`)
- Mobile fixes (chat, header)

### Commits importanti:

```
ee0d9ee - feat(db): add isTestData schema (W1)
39d2704 - feat(env): add PROTECTED_USERS (W1)
71d4e12 - docs(adr): ADR 0065 test isolation
3309bf4 - test(e2e): admin visual regression
d25f5945 - feat(mobile): header + chat fixes (W4)
```

---

## Task Remaining (9/25)

### W4 Pending (4 tasks):

1. **T4-03**: Sidebar collapsible (P2) - ~2h
   - Refs: `docs/mobile-ux-audit-report.md` Section 2
   - Fix: 77% width → collapsible drawer
   - Touch targets ≥44px

2. **T4-05**: Tools mobile (P2) - ~3h
   - Refs: Audit Section 4
   - Fix: Modal 70vh → bottom sheet
   - Tool buttons responsive

3. **T4-06**: Voice controls size (P2) - ~2h
   - Refs: Audit Section 5
   - Fix: 68% viewport → <30%
   - Bottom sheet pattern

4. **T4-07**: Touch targets verification (P2) - ~1h
   - Verify all buttons ≥44px
   - WCAG 2.5.5 compliance check

### W5 Pending (4 tasks):

1. **T5-01**: Playwright mobile tests infrastructure
2. **T5-02**: iPhone SE/13 viewport tests
3. **T5-03**: Android Pixel 7 tests
4. **T5-04**: iPad tests

### T3-04 Blocked:

- **Action required**: User must test voice on iPhone using `docs/voice-iphone-testing-checklist.md`

---

## Thor Validation Status

| Wave | Lint | Typecheck | Build | Status                        |
| ---- | ---- | --------- | ----- | ----------------------------- |
| W1   | ✓    | ✓         | ✓     | PASS                          |
| W2   | ✓    | ✓         | ✓     | PASS                          |
| W3   | ✓    | ✓         | ✓     | PASS                          |
| W4   | ⏳   | ⏳        | ⏳    | Pending after task completion |
| W5   | ⏳   | ⏳        | ⏳    | Pending                       |

---

## Closure Checklist (quando tutte le wave sono complete)

Prima di creare la PR:

- [ ] W4 completata (4 task pending)
- [ ] W5 completata (4 task)
- [ ] T3-04: Utente ha testato voice su iPhone (blocked)
- [ ] Thor validation finale: `npm run lint && npm run typecheck && npm run build`
- [ ] Tutti i commit nel worktree `feature/admin-theme-mobile-ux`
- [ ] Branch main non toccato
- [ ] Aggiornare CHANGELOG.md con user-facing changes

Poi crea PR:

```bash
cd /Users/roberdan/GitHub/MirrorBuddy-admin-theme-mobile-ux
git push -u origin feature/admin-theme-mobile-ux
gh pr create --title "Admin Theme + Test Isolation + Mobile UX (Plan 063)" \
  --body "$(cat <<'EOF'
## Summary
- Admin UI aligned with design system (F-01, F-15)
- Test data isolation for clean production (F-02-F-06)
- Mobile UX fixes: header, sidebar, chat, tools, voice (F-08-F-12)
- Mobile responsive E2E tests (F-14, F-23)

## Test Plan
- [x] Thor validation: lint, typecheck, build
- [x] Visual regression tests pass
- [ ] Manual mobile testing (iPhone, Android, iPad)
- [ ] Voice test on iPhone iOS17+ (T3-04)

🤖 Generated with Plan 063
EOF
)"
```

---

## Token Budget Used

**Total**: ~102K tokens (di 200K)
**By Wave**:

- W1: ~40K (database + isolation)
- W2: ~30K (admin theming)
- W3: ~20K (voice investigation + fixes)
- W4 partial: ~12K (audit + 2 fixes)

**Remaining**: ~98K per W4 completion + W5

---

## Contatti & Blockers

**Se T3-04 rimane bloccato**: Chiedere all'utente lo stato del test iPhone prima di chiudere il piano.

**Per domande sul piano**: Riferimenti in `~/.claude/plans/mirrorbuddy/AdminTheme-TestIsolation-MobileUX-Main.md`

**Dashboard**: http://localhost:31415 per monitoraggio progress in tempo reale.
