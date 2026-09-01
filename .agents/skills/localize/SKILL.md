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

## When to Use

- Adding or changing UI text
- Checking PRs that touch user-facing copy
- Auditing locale completeness before merge

## Workflow

### 1. Run Full i18n Check

```bash
npm run i18n:check
```

### 2. Check for Hardcoded Italian (if file path provided)

```bash
npx eslint {file} --rule 'local-rules/no-hardcoded-italian: error'
```

### 3. Verify Translation Keys and Recheck

For each missing key: verify intent, sync locales, then rerun checks.

```bash
npx tsx scripts/i18n-sync-namespaces.ts --add-missing
npm run i18n:check
```

### 4. Fix Hardcoded Italian

- BAD: `<span>Ciao!</span>`
- GOOD: `const t = useTranslations(); <span>{t('greetings.hello')}</span>`

## Verification Checklist

- [ ] `npm run i18n:check` returns PASS
- [ ] No hardcoded Italian detected
- [ ] All 5 locales have aligned key coverage

## Blocking Rules

- **FAIL** = Don't merge. Fix missing translations first.
- **PASS** = Safe to commit.
- CI/CD: `npm run release:gate` includes localization check.
