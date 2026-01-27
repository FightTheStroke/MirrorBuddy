# ADR 0091: i18n Translation Key Naming Convention

## Status

Accepted

## Date

2026-01-27

## Context

During Plan 91 (I18n-Localization-Fix), we discovered a systemic issue where translation keys in components used **kebab-case** (e.g., `t("with-teachers")`) while the JSON message files used **camelCase** (e.g., `"withTeachers"`).

This mismatch caused:

1. **Silent failures** - Keys not found, fallback to key name displayed
2. **Inconsistent UI** - Some translations worked, others showed raw keys
3. **Hard to debug** - No compile-time or runtime errors, just missing text
4. **Wasted effort** - Translations existed but weren't being used

### Root Cause

No enforced convention for translation key naming. Developers used different styles:

- Component A: `t("my-key")` (kebab-case)
- Component B: `t("myKey")` (camelCase)
- JSON files: Mix of both, mostly camelCase

## Decision

**All translation keys MUST use camelCase.**

### Rules

1. **JSON keys**: camelCase only (`"withTeachers"`, not `"with-teachers"`)
2. **t() calls**: camelCase only (`t("withTeachers")`, not `t("with-teachers")`)
3. **Nested keys**: camelCase at each level (`t("welcome.quickStart.title")`)
4. **No exceptions**: Even for compound words (`textToSpeech`, not `text-to-speech`)

### Examples

```typescript
// CORRECT
t("withTeachers");
t("anyAbility");
t("readableFonts");
t("welcome.quickStart.updateProfile");

// WRONG - will be caught by ESLint
t("with-teachers");
t("any-ability");
t("readable-fonts");
t("welcome.quick-start.update-profile");
```

## Enforcement

### 1. ESLint Rule (Automatic)

Custom ESLint rule `no-kebab-case-i18n-keys` blocks:

- `t("kebab-case-key")`
- `useTranslations("kebab-case")`
- Any translation function call with kebab-case argument

Location: `eslint-local-rules/no-kebab-case-i18n-keys.js`

### 2. Pre-commit Hook

Runs ESLint on staged files, blocking commits with kebab-case keys.

### 3. CI Gate

ESLint runs in CI pipeline, failing builds with violations.

## Consequences

### Positive

- **Consistency** - All keys follow same pattern
- **Reliability** - Keys always match between code and JSON
- **Developer Experience** - Clear convention, no guessing
- **Automated enforcement** - Errors caught before runtime

### Negative

- **Migration effort** - Existing kebab-case keys need conversion (done in Plan 91)
- **Learning curve** - Developers must remember convention

## Migration

Plan 91 converted all existing kebab-case keys:

| Component                   | Keys Fixed |
| --------------------------- | ---------- |
| hero-section.tsx            | 6          |
| quick-start.tsx             | 2          |
| tier-comparison-section.tsx | 2          |
| trial-limits-banner.tsx     | 1          |
| voice-fallback-banner.tsx   | 1          |
| info-step-form.tsx          | 1          |
| info-step-voice.tsx         | 1          |
| welcome-form-content.tsx    | 1          |
| **Total**                   | **15**     |

## References

- Plan 91: I18n-Localization-Fix
- ADR 0082: i18n Namespace Structure
- ADR 0083: i18n Context Architecture
- next-intl documentation: https://next-intl-docs.vercel.app/
