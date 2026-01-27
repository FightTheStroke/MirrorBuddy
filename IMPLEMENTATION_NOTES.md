# ESLint Rule Implementation: no-hardcoded-italian

## Task: T7-15 - Add ESLint rule to detect hardcoded Italian strings in JSX/TSX files

### F-52 Verification: ESLint warns when hardcoded user-facing strings are detected

#### Acceptance Criteria Status

| #   | Criterion                                       | Status  | Evidence                                                                 |
| --- | ----------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| 1   | Create custom ESLint rule                       | ✅ PASS | `/eslint-local-rules/index.js` - 95 line custom rule implementation      |
| 2   | Warn on Italian text in JSX (not comments/code) | ✅ PASS | Rule uses `JSXText` visitor node, detects Italian words + accented chars |
| 3   | Allow exceptions via eslint-disable             | ✅ PASS | `eslint-disable-next-line local-rules/no-hardcoded-italian` works        |
| 4   | Add rule to eslint.config.js                    | ✅ PASS | Line 42: `"local-rules/no-hardcoded-italian": "warn"`                    |
| 5   | Rule severity: "warn"                           | ✅ PASS | Configured as "warn" for gradual adoption                                |
| 6   | Document the rule                               | ✅ PASS | `/eslint-local-rules/README.md` with examples and usage                  |

### Implementation Summary

**Files Created:**

1. `eslint-local-rules/index.js` - Custom ESLint rule plugin (95 lines)
2. `eslint-local-rules/README.md` - Rule documentation with examples
3. `eslint.config.js` - ESLint 9 configuration with custom rule enabled
4. `src/__tests__/eslint-rules/no-hardcoded-italian.test.ts` - Unit tests (110 lines)

**How It Works:**

The rule detects hardcoded Italian strings by:

1. Listening for `JSXText` nodes (text inside JSX elements)
2. Checking for Italian patterns:
   - Common Italian words (ciao, salva, benvenuto, etc.)
   - Accented characters (àèéìòùù)
3. Reporting violations with helpful message

**Examples:**

```jsx
// ❌ Triggers warning
<p>Ciao mondo</p>;

// ✅ No warning
const t = useTranslations();
<p>{t("greeting")}</p>;

// ✅ No warning (disabled)
{
  /* eslint-disable-next-line local-rules/no-hardcoded-italian */
}
<p>Giuseppe Garibaldi</p>;
```

### Test Coverage

```
✓ Detection of Italian words (ciao, salva, benvenuto, etc.)
✓ Detection of accented characters (à, è, é, ì, ò, ù)
✓ Ignores English text
✓ Ignores whitespace
✓ Ignores variables/expressions
✓ Case-insensitive matching
✓ Handles punctuation correctly
✓ Word boundary matching (no partial matches)
✓ Rule metadata verification
✓ JSXText visitor present

10/10 tests passing ✅
```

### How to Use

**Run ESLint:**

```bash
npm run lint src/
```

**Expected output for hardcoded Italian:**

```
/path/to/file.tsx
  15:11  warning  Hardcoded Italian text detected in JSX. Use useTranslations() hook instead for i18n support  local-rules/no-hardcoded-italian
```

**Disable the rule for a line:**

```jsx
{
  /* eslint-disable-next-line local-rules/no-hardcoded-italian */
}
<p>Exception text</p>;
```

**Disable for entire component:**

```jsx
// eslint-disable local-rules/no-hardcoded-italian
const NoTranslateComponent = () => {
  return <p>Hardcoded Italian OK here</p>;
};
// eslint-enable local-rules/no-hardcoded-italian
```

### Integration Points

- **ESLint Config:** `eslint.config.js` (line 42)
- **Plugin Location:** `eslint-local-rules/index.js`
- **Plugin Rules Map:** `rules: { "no-hardcoded-italian": ... }`
- **Rule Registry:** `local-rules/` namespace

### Next Steps (Optional Enhancements)

1. Expand Italian word list based on team feedback
2. Add support for other languages (Spanish, French, etc.)
3. Create auto-fix suggestions for common patterns
4. Add configuration options for severity levels per file type
5. Integrate with CI/CD pipeline to enforce on PRs
