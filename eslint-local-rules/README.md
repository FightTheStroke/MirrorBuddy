# ESLint Local Rules

Custom ESLint rules for MirrorBuddy i18n enforcement.

## no-hardcoded-italian

Detects hardcoded Italian strings in JSX content and warns developers to use the `useTranslations()` hook instead for i18n support.

### Rule Details

This rule checks for Italian text (via common words and accented characters) that appears directly in JSX content and suggests using the i18n system instead.

**What it detects:**
- Italian text in JSX elements: `<p>Ciao mondo</p>`
- Common Italian words (benvenuto, salva, etc.)
- Italian accented characters (à, è, é, ì, ò, ù)

**What it ignores:**
- Comments (even with Italian text)
- Variable names and identifiers
- Import statements
- Text inside expressions `{variable}`
- Code statements like `console.log()`
- Lines with `eslint-disable` comments

### Examples

#### Bad - Hardcoded Italian

```jsx
// ❌ Direct Italian text in JSX
<p>Ciao mondo</p>

// ❌ Italian in button
<button>Salva</button>

// ❌ Multiple Italian strings
<div>
  <h1>Benvenuto</h1>
  <p>Accedi al tuo account</p>
</div>
```

#### Good - Using i18n

```jsx
// ✅ Using useTranslations hook
const MyComponent = () => {
  const t = useTranslations();
  return <p>{t('greeting')}</p>;
};

// ✅ Using imported translations object
<p>{translations.welcome}</p>

// ✅ Using variable (not evaluated as hardcoded)
const message = 'Ciao';
<p>{message}</p>
```

### Severity

Default: `warn`

This is intentionally set to `warn` (not `error`) to allow gradual adoption. Teams can upgrade to `error` once all hardcoded strings are migrated.

### Disabling

For legitimate cases where Italian text is needed (e.g., proper names, examples), use `eslint-disable`:

```jsx
// eslint-disable-next-line no-hardcoded-italian
<p>Giuseppe Garibaldi</p>
```

Or for entire components:

```jsx
// eslint-disable no-hardcoded-italian
const NoTranslateComponent = () => {
  return <p>Hardcoded Italian is OK here</p>;
};
// eslint-enable no-hardcoded-italian
```

### Configuration

The rule is enabled in `eslint.config.js`:

```javascript
rules: {
  "local-rules/no-hardcoded-italian": "warn",
}
```

To disable globally:

```javascript
"local-rules/no-hardcoded-italian": "off",
```

To make it an error:

```javascript
"local-rules/no-hardcoded-italian": "error",
```

### Implementation Details

The rule works by:

1. Listening for `JSXText` nodes (text content inside JSX elements)
2. Checking if the text matches Italian patterns:
   - Contains common Italian words (ciao, salvo, benvenuto, etc.)
   - Contains Italian accented characters (àèéìòù)
3. Skipping whitespace-only text and non-alphabetic content
4. Reporting violations with a helpful message

### Testing

Run tests:

```bash
npm run test:unit -- no-hardcoded-italian
```

Test file: `eslint-local-rules/__tests__/no-hardcoded-italian.test.ts`

### Related

- i18n Hook: `src/hooks/useTranslations.ts`
- i18n Config: `src/i18n/`
- i18n Documentation: `src/hooks/README-useTranslations.md`
