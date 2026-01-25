# i18n Development Workflow

Practical guide for adding and testing translations.

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

## Reference

Full API docs: `i18n.md` (hooks, namespaces, patterns)
