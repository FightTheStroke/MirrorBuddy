# i18n Pre-Commit Hook

## Overview

The pre-commit hook automatically validates internationalization (i18n) translation consistency before commits. It ensures that all language message files have matching keys and valid JSON structure.

## How It Works

When you commit changes to any message files (in the `messages/` directory), the pre-commit hook:

1. Detects staged message files using `git diff --cached`
2. Runs the `npm run i18n:check` command
3. Validates that all language files have consistent keys:
   - Uses Italian (`it.json`) as the reference locale
   - Compares all other languages against it
   - Detects missing keys (causes commit to fail)
   - Detects extra keys (reports warning but allows commit)
4. Blocks the commit if validation fails

## Message File Structure

Supported language files in `messages/`:

- `en.json` - English
- `it.json` - Italian (reference locale)
- `de.json` - German
- `es.json` - Spanish
- `fr.json` - French

## Valid JSON Requirements

- All files must be valid JSON
- Keys must be consistent across all languages
- No extra keys allowed in non-reference languages (blocking)
- No missing keys allowed in any language (blocking)

## Pre-Commit Hook Output

### Success Example

```
✓ i18n validation passed
```

### Failure Example

```
❌ i18n validation failed:

de.json is missing keys from it.json:
  - common.loading
  - auth.login
```

## Usage

### Normal Workflow

```bash
# Edit message files
nano messages/en.json
nano messages/de.json

# Stage your changes
git add messages/

# Commit - hook runs automatically
git commit -m "feat(i18n): add new translations"
```

The hook blocks the commit if there are missing keys.

### Skipping the Hook

If you absolutely need to skip the hook (not recommended):

```bash
git commit --no-verify -m "your commit message"
```

**Warning**: Using `--no-verify` bypasses ALL pre-commit checks, including security scans. Only use this for emergency situations.

## Hook Location

- Path: `.husky/pre-commit`
- Script: `scripts/i18n-check.ts`
- npm script: `npm run i18n:check`

## Manual Validation

To manually check i18n consistency without committing:

```bash
npm run i18n:check
```

Output format:

```
Checking i18n completeness...

Reference locale: it (714 keys)

✓ it.json: 714/714 keys
✓ en.json: 714/714 keys
✓ de.json: 714/714 keys
✓ es.json: 714/714 keys
✓ fr.json: 714/714 keys

Result: PASS
```

## Troubleshooting

### Error: "missing keys"

**Cause**: A translation file is missing keys from the reference language

**Solution**:

1. Run `npm run i18n:check` to see which keys are missing
2. Add the missing keys to your language file
3. Commit again

Example:

```bash
npm run i18n:check
# Output shows: de.json is missing keys from it.json: common.loading, common.error

# Edit de.json and add the missing keys:
# "common": {
#   "loading": "Laden...",
#   "error": "Fehler",
#   ...
# }

git add messages/de.json
git commit -m "fix(i18n): add missing German translations"
```

### Error: "Invalid JSON syntax"

**Cause**: A message file has JSON syntax errors

**Solution**:

1. Validate JSON syntax using a JSON linter
2. Fix syntax errors in the file
3. Commit again

```bash
# Check JSON validity
node -e "console.log(JSON.parse(require('fs').readFileSync('messages/de.json')))"

# If it fails, fix the JSON and try again
```

### Hook Timing Out

**Cause**: The hook is taking longer than expected to run

**Solution**: The hook is designed to execute in < 2 seconds. If it's timing out:

1. Check if message files are very large (>1MB)
2. Verify disk I/O performance
3. Run `npm run i18n:check` manually to confirm it completes quickly

## Test Coverage

The pre-commit hook is tested in `src/__tests__/scripts/i18n-check.test.ts`:

- ✓ Passes when all language files are consistent
- ✓ Detects missing keys in language files
- ✓ Detects extra keys in language files (warns but allows commit)
- ✓ Detects invalid JSON syntax
- ✓ Executes quickly (< 2 seconds)

Run tests:

```bash
npm run test:unit -- src/__tests__/scripts/i18n-check.test.ts
```

## CI/CD Integration

The i18n check also runs in CI/CD pipelines:

- Blocks deployment if validation fails
- Part of pre-push checks
- Integrated with release gates

## References

- Acceptance Criteria: [F-53: Pre-commit hook prevents commits with missing translations]
- Architecture Decision Record (ADR): [i18n validation strategy]
