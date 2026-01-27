# i18n Migration Guide for Existing Components

Migrate hardcoded Italian strings to multi-language i18n support using next-intl.

## Quick Start

### 1. Identify Hardcoded Italian Strings

Run the ESLint rule to detect hardcoded Italian:

```bash
npm run lint
```

The `no-hardcoded-italian` rule warns on Italian text in JSX, common Italian words, and accented characters (à, è, é, ì, ò, ù).

### 2. Extract Strings to Translation Files

Add strings to `src/i18n/messages/it.json`:

```json
{
  "common": {
    "save": "Salva",
    "cancel": "Annulla",
    "loading": "Caricamento in corso"
  }
}
```

### 3. Update Components to Use i18n

**Before:**

```tsx
function SaveButton() {
  return <button>Salva</button>;
}
```

**After:**

```tsx
import { useTranslations } from "@/hooks/useTranslations";

function SaveButton() {
  const t = useTranslations("common");
  return <button>{t("save")}</button>;
}
```

### 4. Handle Dynamic Content

Use variable interpolation for dynamic values:

```tsx
const t = useTranslations("common");
<p>{t("itemsFound", { count: itemCount })}</p>;
```

Message file: `"{count} elementi trovati"`

### 5. Multi-Namespace Components

For components accessing multiple namespaces:

```tsx
import { useTranslationsGlobal } from "@/hooks/useTranslations";

function ComplexComponent() {
  const t = useTranslationsGlobal();
  return (
    <div>
      <h1>{t("common.title")}</h1>
      <span>{t("errors.notFound")}</span>
    </div>
  );
}
```

## ESLint Rule: no-hardcoded-italian

**Rule:** `local-rules/no-hardcoded-italian`

**Detects:**

- JSX text nodes with Italian content
- Common Italian vocabulary (ciao, benvenuto, accedi, salva, etc.)
- Italian accented characters

**Ignores:**

- Comments, variable names, imports, expressions `{variable}`, eslint-disable lines

**Disable for legitimate cases:**

```tsx
// eslint-disable-next-line no-hardcoded-italian
<p>Giuseppe Garibaldi</p>

// Or entire component:
// eslint-disable no-hardcoded-italian
// ... code ...
// eslint-enable no-hardcoded-italian
```

## Verification: i18n-Check Script

Verify translation completeness after adding keys:

```bash
npm run i18n:check
```

**What it does:**

1. Loads all locale files (it, en, fr, de, es)
2. Compares keys across locales
3. Reports missing/extra keys

**Sample output:**

```
✓ it.json: 35/35 keys
✓ en.json: 35/35 keys
✗ fr.json: 32/35 keys (Missing: auth.register, validation.email)
Result: FAIL (5 missing keys)
```

**Exit codes:** 0 = PASS, 1 = FAIL

## Migration Checklist

- [ ] Run `npm run lint` to identify hardcoded strings
- [ ] Determine namespace (common, auth, errors, validation, etc.)
- [ ] Add keys to `src/i18n/messages/it.json`
- [ ] Add keys to all locales (en, fr, de, es)
- [ ] Import `useTranslations` hook
- [ ] Replace hardcoded strings with `t('key')`
- [ ] Handle dynamic values with variable interpolation
- [ ] Run `npm run lint` to verify no violations
- [ ] Run `npm run i18n:check` to verify completeness
- [ ] Run `npm run test:unit` to verify behavior
- [ ] Commit: `i18n: migrate [component-name]`

## Namespace Organization

| Namespace       | Purpose             | Examples              |
| --------------- | ------------------- | --------------------- |
| `common`        | UI labels, actions  | save, cancel, loading |
| `navigation`    | Routes, menus       | home, settings        |
| `auth`          | Login, registration | login, register       |
| `errors`        | Error messages      | notFound, serverError |
| `validation`    | Form validation     | required, email       |
| `status`        | Status indicators   | active, pending       |
| `accessibility` | ARIA labels         | skipToContent         |

## Best Practices

1. **Use specific namespaces** (not global)

   ```tsx
   ✅ const t = useTranslations('auth');
   ❌ const t = useTranslationsGlobal();
   ```

2. **Use common translations hook** for frequent strings

   ```tsx
   ✅ const { save, cancel } = useCommonTranslations();
   ```

3. **Keep keys hierarchical** for related strings

   ```json
   ✅ "form.labels.firstName": "Nome"
   ```

4. **Test all locales** before deployment
   ```bash
   npm run i18n:check && npm run test:unit
   ```

## Troubleshooting

| Issue                                   | Solution                                                               |
| --------------------------------------- | ---------------------------------------------------------------------- |
| ESLint warns but text needed in Italian | Use `eslint-disable-next-line no-hardcoded-italian`                    |
| i18n-check fails with missing keys      | Add keys to all locale files (it, en, fr, de, es)                      |
| Variable interpolation not working      | Check format: `"{variable}"` and pass: `t('key', { variable: value })` |
| Component still not translating         | Use `useTranslations` hook, verify namespace matches message file      |
