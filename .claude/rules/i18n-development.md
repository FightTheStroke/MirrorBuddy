# i18n Development Workflow

Practical guide for building **fully localized features from day 1** with support for all 5 languages (IT, EN, FR, DE, ES), language-specific maestri, and multilingual testing.

## Adding New Translation Keys (Checklist)

1. **Decide namespace**: `common` | `navigation` | `auth` | `toasts` | `{feature}`
2. **Key naming**: Use kebab-case, max 3 nesting levels (`namespace.group.key`)
3. **Add to ALL 5 languages**: `messages/{it,en,fr,de,es}.json` (identical structure)
4. **Match variable names**: `{min}`, `{count}` must be identical across all languages
5. **Test locally**: `npm run dev` → switch languages via URL (`/it/`, `/en/`, etc.)
6. **Typecheck**: `npm run typecheck` (catches missing keys before commit)

## Testing Translations Locally

```bash
npm run dev  # Dev server :3000
```

**Language switching**:

- URL: `/it/chat` → `/en/chat` → `/fr/chat` (locale prefix required)
- Code: `useLocaleContext()` hook to switch programmatically

**Verify variables**:

```tsx
const t = useTranslations("auth");
t("password-min-length", { min: 8 }); // Test in console
```

## CI/Pre-Commit Requirements

**Pre-commit**:

```bash
npm run typecheck  # Catches missing keys
npm run lint       # Unused imports
```

**Pre-push**:

```bash
npm run i18n:validate  # Verify all 5 languages match
npm run build          # Full validation
npm run test:unit      # Unit tests
```

**CI blocks**:

- Missing key in any language → BUILD FAILS
- Variable mismatch → BUILD FAILS
- TypeScript errors → BUILD FAILS

## t() vs getTranslations()

| When                             | Use                       |
| -------------------------------- | ------------------------- |
| Client component, interactive    | `useTranslations()`       |
| Server component, static content | `getTranslations()`       |
| Multiple namespaces              | `useTranslationsGlobal()` |
| Current locale needed            | `useLocaleContext()`      |

**Examples**:

- Button click → `useTranslations()` (client)
- Page `<title>` → `getTranslations()` (server)
- Toast notification → `useTranslations()` (client logic)

## Anti-Patterns

- ❌ Hardcoded strings: `<button>Save</button>`
- ❌ Wrong namespace: `t("save")` when should be `t("common.save")`
- ❌ Variable case mismatch: `{Min}` vs `{min}` across languages
- ❌ Partial translations: Missing from even one language

## Quick Verification

```bash
npm run typecheck          # Missing keys
npm run i18n:validate      # Language consistency
npm run build && npm test  # Full validation
```

## Feature Launch Checklist (TDD for i18n)

**Before implementation**:

- [ ] Identify ALL UI strings in feature (buttons, labels, errors, toasts)
- [ ] Create namespace for feature: `{feature}.json` in all 5 language files
- [ ] Type-check passes: `npm run typecheck` (catches missing keys)
- [ ] Create E2E test fixtures for each locale: `e2e/fixtures/i18n-{feature}-*.ts`

**During implementation**:

- [ ] Use `useTranslations('{feature}')` in components
- [ ] All hardcoded strings must fail ESLint (automated pre-commit check)
- [ ] Language switching (/it/ → /en/ → /fr/ → /de/ → /es/) must work
- [ ] No variables with mismatched case across languages
- [ ] All 5 language files maintain identical JSON structure

**Before merge**:

- [ ] `npm run i18n:validate` passes (structure match across all 5)
- [ ] E2E tests pass: `npm run test -- e2e/i18n-{feature}`
- [ ] Manual testing in each language (especially non-Latin scripts)
- [ ] Admin locale override tested (if feature impacts maestri/coaches)
- [ ] Locale-specific maestri available if feature is language-teaching

## New Feature: Bilingual Support

**Pattern for features supporting 2+ languages simultaneously**:

```json
{
  "feature.bilingual-mode": "Modalità bilingue",
  "feature.language-pair": "{from} → {to}",
  "feature.auto-translate": "Traduci automaticamente"
}
```

**Implementation**:

1. Create `UseBilingualContext()` hook to track both locale + target language
2. Call `/api/locales` to get available language pairs for user's region
3. Use `getTranslations({ locale: targetLang })` for target language strings
4. Test with language pairs: IT↔EN, IT↔FR, IT↔DE, IT↔ES, FR↔EN, etc.

## Adding Language-Specific Content (e.g., Maestri, Tools)

**Check locale before feature availability**:

```typescript
// src/lib/locale-service.ts
async function isPrimaryLanguageFor(maestroId: string, locale: string) {
  const config = await localeService.getConfig(locale);
  return config.primaryMaestro === maestroId;
}

// In components
const isMolièreAvailable = await isPrimaryLanguageFor("moliere-french", locale);
```

**Features with locale-dependent availability**:

- Maestri (Molière=FR, Goethe=DE, Cervantes=ES)
- Language tools (conjugator, phonetic guide, dialect selector)
- Cultural content (literature, historical context)
- Regional variants (Castilian vs Latin American Spanish)

## Reference

Full API docs: `i18n.md` (hooks, namespaces, patterns)
ADRs: 0064 (Formality rules per language) | 0066 (i18n architecture)
