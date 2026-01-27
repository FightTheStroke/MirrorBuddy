# /localize

Comprehensive localization verification for MirrorBuddy features via `npm run i18n:check`.

## Overview

This skill verifies that all UI features are properly localized across all supported languages (Italian, English, French, German, Spanish). It checks for:

1. **Translation Completeness** - All translation keys exist in all locales
2. **Hardcoded Strings** - Detects Italian text left in code instead of using i18n
3. **Missing Keys** - Reports which translation keys are missing per locale
4. **Reference Validation** - Ensures Italian (reference) locale is complete

It will verify translation keys for new UI components and check for hardcoded Italian strings.

## When to Use

- After adding new UI components or features
- Before committing features that add user-facing text
- After merging translations from translation service
- To verify no hardcoded Italian strings snuck into code
- To check translation status across all languages
- During pull request reviews for UI/feature changes

## Requirements

| Requirement   | Details                                                             |
| ------------- | ------------------------------------------------------------------- |
| Languages     | it (Italian), en (English), fr (French), de (German), es (Spanish)  |
| Message Files | `messages/{locale}.json`                                            |
| ESLint Rule   | `local-rules/no-hardcoded-italian` for JSX detection                |
| Script        | `npm run i18n:check`                                                |
| Git Status    | Should have translation files in git (auto-generated or checked in) |

## Supported Locales

| Locale              | Code | Status          |
| ------------------- | ---- | --------------- |
| Italian (Reference) | it   | Source of truth |
| English             | en   | Required match  |
| French              | fr   | Required match  |
| German              | de   | Required match  |
| Spanish             | es   | Required match  |

## Quick Start

```bash
# Full localization check (all files, all locales)
/localize

# Check specific file for hardcoded Italian strings
/localize src/components/Header.tsx

# Check directory
/localize src/app/chat/
```

## Workflow

### Phase 1: Run Full i18n Check

```bash
npm run i18n:check
```

**Outputs:**

- Reference locale info (Italian - source of truth)
- Key count for each locale
- Missing keys (if any) with examples
- Extra keys (if any) with examples
- Overall PASS/FAIL status

**Example output:**

```
Checking i18n completeness...

Reference locale: it (1,234 keys)

✓ it.json: 1,234/1,234 keys
✓ en.json: 1,234/1,234 keys
✗ fr.json: 1,200/1,234 keys
  Missing: features.chat.voice, features.tools.pdf (+34 more)
✓ de.json: 1,234/1,234 keys
✓ es.json: 1,234/1,234 keys

Result: FAIL (34 missing keys)
```

### Phase 2: Check for Hardcoded Italian in Recent Changes

If file path provided, check that file:

```bash
npx eslint {file} --rule 'local-rules/no-hardcoded-italian: error'
```

**Checks for:**

- Italian accented characters (à, è, é, ì, ò, ù)
- Common Italian words in JSX text
- Provides exact locations of violations

### Phase 3: Identify Missing Translation Keys

For each missing key, verify:

1. **Is it new?** Check git diff for new UI text
2. **Where is it used?** Search codebase for translation key usage
3. **Need translation?** If yes, add to `messages/{locale}.json`
4. **Ready to merge?** Only if all locales are complete

### Phase 4: Fix and Recheck

After adding missing translations:

```bash
# Rerun verification
/localize

# If specific file was problematic, check again
/localize src/path/to/file.tsx
```

## Output Format

### Success (PASS)

```
✓ it.json: 1,234/1,234 keys
✓ en.json: 1,234/1,234 keys
✓ fr.json: 1,234/1,234 keys
✓ de.json: 1,234/1,234 keys
✓ es.json: 1,234/1,234 keys

Result: PASS
```

### Failure (FAIL)

```
✓ it.json: 1,234/1,234 keys
✓ en.json: 1,234/1,234 keys
✗ fr.json: 1,200/1,234 keys
  Missing: features.maestri.voice, features.tools.webcam (+32 more)
✓ de.json: 1,234/1,234 keys
✗ es.json: 1,100/1,234 keys
  Missing: features.chat.follow_up, features.learning.pomodoro (+134 more)

Result: FAIL (166 missing keys)
```

### Hardcoded Italian Detection

```
src/components/Chat.tsx
  10:5  error  Hardcoded Italian text detected in JSX.
        Use useTranslations() hook instead for i18n support.
        Text: "Ciao, come stai?"

src/app/page.tsx
  45:3  error  Hardcoded Italian text detected in JSX.
        Use useTranslations() hook instead for i18n support.
        Text: "Benvenuto"

✗ Found 2 hardcoded Italian strings - convert to i18n
```

## Common Issues

### Issue: Missing keys in some locales

**Cause:** Translation service hasn't delivered all translations yet.

**Resolution:**

```bash
# Check which locale is missing which keys
/localize

# Find where that key is used
grep -r "missing.key.name" src/

# Either:
# 1. Add translation to messages/{locale}.json
# 2. Or, if new key, verify it's intentional and update all locales
```

### Issue: Hardcoded Italian detected

**Cause:** JSX text was hardcoded instead of using `useTranslations()`.

**Resolution:**

```bash
# Fix the file
# Instead of:
<span>Ciao!</span>

# Use:
const t = useTranslations();
<span>{t('greetings.hello')}</span>
```

### Issue: Extra keys in some locales

**Cause:** Old translation keys that are no longer used.

**Resolution:**

- Safe to remove if key is no longer referenced in code
- Use grep to verify: `grep -r "key.name" src/`
- Clean up: Remove from `messages/{locale}.json`

## Integration with Workflow

### Before Committing Code

```bash
# Check localization status
/localize

# For feature branch work
/localize src/app/features/new-feature/
```

**FAIL Result:** Don't merge - fix missing translations first.

**PASS Result:** Safe to commit.

### In Pull Requests

- Add comment if localization is complete: "✓ Localization verified"
- Reference `/localize` output if there are issues
- Link to translation service tickets for missing languages

### In CI/CD

The `npm run release:gate` includes localization check:

```bash
npm run i18n:check || { echo "Translation incomplete"; exit 1; }
```

## Verification Checklist

Before marking localization as done:

- [ ] `/localize` returns PASS
- [ ] No hardcoded Italian detected (if checking specific files)
- [ ] All 5 locales have same key count
- [ ] Missing keys list is empty
- [ ] New translation keys are intentional (not mistakes)
- [ ] PR review confirms translations make sense

## Key Concepts

| Term                 | Definition                                            |
| -------------------- | ----------------------------------------------------- |
| **Reference Locale** | Italian (it) - source of truth for all keys           |
| **Key**              | Translation identifier, e.g., `features.chat.message` |
| **Missing Key**      | Key exists in Italian but not in other locale         |
| **Extra Key**        | Key exists in locale but not in Italian               |
| **Hardcoded String** | Italian text in JSX instead of using i18n             |
| **Complete Locale**  | All keys match the reference locale                   |

## File Structure

```
messages/
├── it.json          # Reference (Italian)
├── en.json          # English translations
├── fr.json          # French translations
├── de.json          # German translations
└── es.json          # Spanish translations

src/
├── lib/
│   └── i18n.ts      # useTranslations() hook usage
└── ... other files
```

## Related

- **i18n-check script**: `scripts/i18n-check.ts` - Detailed key comparison
- **ESLint rule**: `eslint-local-rules/index.js` - Hardcoded Italian detection
- **Message files**: `messages/` directory - All translations
- **CLAUDE.md**: Project documentation on i18n setup
- **Plan**: Plan 78 (i18n infrastructure)

## Quick Commands

```bash
# Full check
npm run i18n:check

# Find a translation key usage
grep -r "chat.message" src/

# List all keys in Italian
jq 'keys' messages/it.json | head -20

# Count keys by locale
jq 'keys | length' messages/{it,en,fr,de,es}.json

# Pretty print message structure
jq . messages/en.json | head -50
```

## Tips

1. **Keep translations in sync** - Run `/localize` after every feature
2. **Use meaningful keys** - `features.chat.send_button` not `btn_1`
3. **Provide context** - Translation comments help translators
4. **Test all locales** - Use browser dev tools to switch language
5. **Automate checks** - Include in CI/CD pipeline
