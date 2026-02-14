---
name: localize
description: Comprehensive localization verification for MirrorBuddy features via npm run i18n:check
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
context: fork
user-invocable: true
---

# /localize

Localization verification for MirrorBuddy (5 languages: it, en, fr, de, es).

## Workflow

### 1. Run Full i18n Check

```bash
npm run i18n:check
```

### 2. Check for Hardcoded Italian (if file path provided)

```bash
npx eslint {file} --rule 'local-rules/no-hardcoded-italian: error'
```

### 3. Fix and Recheck

For missing keys: add translations to `messages/{locale}.json`. For hardcoded Italian: use `useTranslations()` hook.

## Quick Commands

```bash
npm run i18n:check                    # Full check
grep -r "key.name" src/               # Find key usage
jq 'keys | length' messages/*.json    # Count keys per locale
```

## Blocking Rules

- **FAIL** = Don't merge. Fix missing translations first.
- **PASS** = Safe to commit.
- CI/CD: `npm run release:gate` includes localization check.
