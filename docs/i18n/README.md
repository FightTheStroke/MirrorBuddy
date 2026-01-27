# i18n Development Guide

This guide explains how to add, maintain, and use translations in MirrorBuddy using the `next-intl` library.

## Quick Start

```tsx
// In a client component
import { useTranslations } from "next-intl";

export function MyComponent() {
  const t = useTranslations("common");
  return <button>{t("save")}</button>;
}
```

```tsx
// In a server component
import { getTranslations } from "next-intl/server";

export async function MyServerComponent() {
  const t = await getTranslations("common");
  return <button>{t("save")}</button>;
}
```

## Documentation Sections

### [SETUP.md](./SETUP.md)

Configure locales, understand folder structure, and set up the i18n system.

- Folder structure and conventions
- Locale configuration (config.ts)
- Message file organization
- Adding new languages

### [GUIDE.md](./GUIDE.md)

Step-by-step guide to adding new translation keys and managing translations.

- Namespace conventions
- Adding new translation keys
- Working with message files
- Quality validation

### [HOOKS.md](./HOOKS.md)

Comprehensive reference for translation hooks and functions.

- `useTranslations()` hook
- `useTranslationsGlobal()` for multiple namespaces
- `useCommonTranslations()` shortcut
- `formatMessage()` for non-component code
- Variables and rich text formatting

### [COMPONENTS.md](./COMPONENTS.md)

Server vs client component translation patterns and best practices.

- Server components with `getTranslations()`
- Client components with hooks
- Hybrid patterns
- Locale context and switching

### [EXAMPLES.md](./EXAMPLES.md)

Real-world code examples and troubleshooting guide.

- Common scenarios
- Locale-aware formatting
- Testing translations
- Troubleshooting errors

## Key Concepts

### Locales

Supported languages: **Italian** (it), **English** (en), **French** (fr), **German** (de), **Spanish** (es)

### Namespaces

Translations are organized by namespace:

- `common` - Universal UI strings (save, cancel, loading)
- `navigation` - Menu items, links, breadcrumbs
- `auth` - Login, signup, validation
- `{feature}` - Feature-specific strings

### Message Files

All translations live in `messages/{locale}.json`:

```
messages/
├── it.json  (Italian)
├── en.json  (English)
├── fr.json  (French)
├── de.json  (German)
└── es.json  (Spanish)
```

## Typical Workflow

1. **Add key** to all message files (`messages/it.json`, `messages/en.json`, etc.)
2. **Use in component** with `useTranslations("namespace")` or `getTranslations("namespace")`
3. **Type check** with `npm run typecheck` to verify keys exist
4. **Test** in each language to confirm translations display correctly

## Configuration Files

| File                           | Purpose                     |
| ------------------------------ | --------------------------- |
| `src/i18n/config.ts`           | Locale list, names, flags   |
| `src/i18n/request.ts`          | Server-side message loading |
| `src/i18n/routing.ts`          | Route configuration         |
| `src/i18n/types.ts`            | TypeScript types            |
| `src/i18n/locale-provider.tsx` | Client provider             |

## Common Commands

```bash
npm run typecheck    # Verify all translation keys
npm run build        # Build with i18n validation
npm run dev          # Dev server with live translations
npm run test         # Run tests with message mocking
```

## Next Steps

- Start with [SETUP.md](./SETUP.md) to understand the project structure
- Follow [GUIDE.md](./GUIDE.md) when adding new translations
- Reference [HOOKS.md](./HOOKS.md) for API details
- See [COMPONENTS.md](./COMPONENTS.md) for architectural patterns
- Use [EXAMPLES.md](./EXAMPLES.md) for specific use cases and troubleshooting

## References

- **Library:** [next-intl documentation](https://next-intl-docs.vercel.app/)
- **Project:** Configuration in `src/i18n/`
- **Messages:** Translation files in `messages/`
