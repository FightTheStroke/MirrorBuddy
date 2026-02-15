# /localize

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->

Localization verification for MirrorBuddy (5 locales: it/en/fr/de/es).

## Overview

Verify translation keys are complete across all locales, detect hardcoded Italian
strings, and fix missing translations. Ensures i18n compliance before merge.

## When to Use

- Adding/changing UI text
- Before merging PRs with component changes
- Periodic translation completeness audits

## Quick Start

```bash
/localize                              # Full check all locales
/localize src/components/Header.tsx    # Check specific file for hardcoded Italian
/localize src/app/chat/                # Check directory
```

## Workflow

### 1. Run Full i18n Check

```bash
npm run i18n:check
```

Output: key count per locale, missing/extra keys, PASS/FAIL.

### 2. Check for Hardcoded Italian (if file provided)

```bash
npx eslint {file} --rule 'local-rules/no-hardcoded-italian: error'
```

Detects: accented chars (à,è,é,ì,ò,ù), common Italian words in JSX.

### 3. Verify Translation Keys

For each missing key: verify intent → add to `messages/{locale}.json` → recheck.

```bash
# Sync missing keys across locales
npx tsx scripts/i18n-sync-namespaces.ts --add-missing
# Recheck
npm run i18n:check
```

### 4. Fix Hardcoded Italian

```tsx
// BAD:  <span>Ciao!</span>
// GOOD: const t = useTranslations();
//       <span>{t('greetings.hello')}</span>
```

## Rules

| Rule             | Detail                                     |
| ---------------- | ------------------------------------------ |
| Reference locale | Italian (it) — source of truth             |
| Key format       | camelCase (ADR 0091)                       |
| JSON wrapper     | `{ "namespace": { ...keys } }` (ADR 0104)  |
| FAIL = BLOCK     | Don't merge with missing translations      |
| CI gate          | `npm run release:gate` includes i18n check |

## Quick Commands

```bash
npm run i18n:check                           # Full check
npx tsx scripts/i18n-sync-namespaces.ts      # Sync missing keys
grep -r "key.name" src/                      # Find key usage
jq 'keys | length' messages/{it,en,fr,de,es}.json  # Count per locale
```

## Verification Checklist

- [ ] `npm run i18n:check` returns PASS
- [ ] No hardcoded Italian detected
- [ ] All 5 locales have same key count
- [ ] New keys are intentional

## Related

- Script: `scripts/i18n-check.ts` | ESLint: `eslint-local-rules/index.js`
- Messages: `messages/` | Rules: `.claude/rules/i18n.md`
