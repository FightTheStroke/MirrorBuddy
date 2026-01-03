# i18n Implementation - Overview

**Issue**: #65
**Branch**: `feature/65-i18n`
**Status**: [ ] NON INIZIATO

---

## Regole di Esecuzione

1. **UN SOLO BRANCH**: `feature/65-i18n` - mai parallelizzare
2. **SEQUENZIALE**: Ogni step DEVE essere completato prima del successivo
3. **CHECKPOINT**: Dopo ogni step, verifica con `npm run typecheck && npm run build`
4. **SE FALLISCE**: Ferma, risolvi, poi continua
5. **COMMIT FREQUENTI**: Ogni step completato = 1 commit

---

## Struttura File Piano

| File | Contenuto | Status |
|------|-----------|--------|
| `i18n-00-Overview.md` | Questo file - tracking generale | 📋 |
| `i18n-01-Setup.md` | Install next-intl, config files | [ ] |
| `i18n-02-Middleware.md` | Locale detection | [ ] |
| `i18n-03-AppRestructure.md` | Move pages to [locale]/ | [ ] |
| `i18n-04-Translations-UI.md` | Extract UI strings | [ ] |
| `i18n-05-Translations-Data.md` | Maestri, Subjects, Buddies | [ ] |
| `i18n-06-AI-Language.md` | System prompts per locale | [ ] |
| `i18n-07-Tests.md` | E2E tests | [ ] |

---

## Progress Tracker

### Step 1: Setup
- [ ] `npm install next-intl`
- [ ] Create `src/i18n/config.ts`
- [ ] Create `src/i18n/request.ts`
- [ ] Create `src/messages/it/common.json`
- [ ] Create `src/messages/en/common.json`
- [ ] Update `next.config.ts`
- [ ] **VERIFY**: `npm run typecheck && npm run build`
- [ ] **COMMIT**: `feat(i18n): add next-intl infrastructure`

### Step 2: Middleware
- [ ] Create `src/middleware.ts`
- [ ] **VERIFY**: App loads, no crashes
- [ ] **COMMIT**: `feat(i18n): add locale detection middleware`

### Step 3: App Restructure (HIGH RISK)
- [ ] Create `src/app/[locale]/` directory
- [ ] Create `src/app/[locale]/layout.tsx` with NextIntlClientProvider
- [ ] Move all 20 pages into `[locale]/`
- [ ] Update root layout.tsx
- [ ] **VERIFY**: `npm run build` + navigate to /it/ and /en/
- [ ] **COMMIT**: `feat(i18n): restructure app for locale routing`

### Step 4: UI Translations
- [ ] Add Language Switcher component
- [ ] Extract settings strings
- [ ] Extract scheduler strings
- [ ] Extract education strings
- [ ] Extract onboarding strings
- [ ] Extract common UI strings
- [ ] **VERIFY**: All pages work in IT and EN
- [ ] **COMMIT**: `feat(i18n): extract UI strings`

### Step 5: Data Translations
- [ ] Create subjects.json (IT + EN)
- [ ] Create maestri.json (IT + EN)
- [ ] Create buddies.json (IT + EN)
- [ ] Update data files to use translation keys
- [ ] **VERIFY**: Maestri display correctly in both languages
- [ ] **COMMIT**: `feat(i18n): localize data files`

### Step 6: AI Language
- [ ] Update system prompts with locale parameter
- [ ] Test AI responses in both languages
- [ ] **VERIFY**: Maestri respond in user's language
- [ ] **COMMIT**: `feat(i18n): AI responds in user language`

### Step 7: Tests
- [ ] Create `e2e/i18n.spec.ts`
- [ ] Create `e2e/i18n-visual.spec.ts`
- [ ] Run all tests
- [ ] **VERIFY**: All tests pass
- [ ] **COMMIT**: `test(i18n): add E2E tests`

### Step 8: Cleanup & PR
- [ ] Final verification: `npm run lint && npm run typecheck && npm run build`
- [ ] Run full E2E suite
- [ ] Create PR to development

---

## Decisioni Tecniche

| Aspetto | Decisione |
|---------|-----------|
| Library | `next-intl` v4.x |
| Locales | `it`, `en` (solo 2 per ora) |
| Default | Browser detection, fallback `it` |
| AI Language | Maestri rispondono nella lingua utente |
| Translations | AI-generated, Roberto spot-check |
| URL Strategy | `/it/page`, `/en/page` |

---

## File da Spostare (20 pages)

```
src/app/page.tsx                    → src/app/[locale]/page.tsx
src/app/welcome/page.tsx            → src/app/[locale]/welcome/page.tsx
src/app/conversazioni/page.tsx      → src/app/[locale]/conversazioni/page.tsx
src/app/materiali/page.tsx          → src/app/[locale]/materiali/page.tsx
src/app/genitori/page.tsx           → src/app/[locale]/genitori/page.tsx
src/app/parent-dashboard/page.tsx   → src/app/[locale]/parent-dashboard/page.tsx
src/app/study-kit/page.tsx          → src/app/[locale]/study-kit/page.tsx
src/app/landing/page.tsx            → src/app/[locale]/landing/page.tsx
src/app/archivio/page.tsx           → src/app/[locale]/archivio/page.tsx
src/app/admin/analytics/page.tsx    → src/app/[locale]/admin/analytics/page.tsx
src/app/test-voice/page.tsx         → src/app/[locale]/test-voice/page.tsx
src/app/test-audio/page.tsx         → src/app/[locale]/test-audio/page.tsx
src/app/showcase/page.tsx           → src/app/[locale]/showcase/page.tsx
src/app/showcase/layout.tsx         → src/app/[locale]/showcase/layout.tsx
src/app/showcase/accessibility/     → src/app/[locale]/showcase/accessibility/
src/app/showcase/flashcards/        → src/app/[locale]/showcase/flashcards/
src/app/showcase/maestri/           → src/app/[locale]/showcase/maestri/
src/app/showcase/quiz/              → src/app/[locale]/showcase/quiz/
src/app/showcase/solar-system/      → src/app/[locale]/showcase/solar-system/
src/app/showcase/mindmaps/          → src/app/[locale]/showcase/mindmaps/
src/app/showcase/chat/              → src/app/[locale]/showcase/chat/
```

**NON spostare**: `src/app/api/` (API routes non hanno locale)

---

## Rollback Strategy

Se qualcosa si rompe durante lo Step 3 (restructure):
```bash
git checkout -- src/app/
git clean -fd src/app/[locale]/
```

---

**Ultimo aggiornamento**: 2026-01-03
**Autore**: Claude Opus 4.5
