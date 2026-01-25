# i18n Setup & Configuration

## Folder Structure

```
project-root/
├── messages/                    # Translation files (root level)
│   ├── it.json                 # Italian translations
│   ├── en.json                 # English translations
│   ├── fr.json                 # French translations
│   ├── de.json                 # German translations
│   └── es.json                 # Spanish translations
│
└── src/
    ├── i18n/
    │   ├── config.ts           # Locale configuration & constants
    │   ├── request.ts          # Server-side request config
    │   ├── routing.ts          # Routing configuration
    │   ├── types.ts            # TypeScript type definitions
    │   ├── index.ts            # Public exports
    │   └── locale-provider.tsx # Client provider wrapper
    │
    ├── hooks/
    │   └── useTranslations.ts  # Translation hook helpers
    │
    └── app/
        └── [locale]/           # Dynamic locale route segment
            ├── layout.tsx      # Root layout with providers
            └── ...             # All app routes nested here
```

## Locale Configuration

### src/i18n/config.ts

Centralizes all locale configuration:

```typescript
export const locales = ["it", "en", "fr", "de", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "it";

export const localeNames: Record<Locale, string> = {
  it: "Italiano",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
};

export const localeFlags: Record<Locale, string> = {
  it: "🇮🇹",
  en: "🇬🇧",
  fr: "🇫🇷",
  de: "🇩🇪",
  es: "🇪🇸",
};
```

## Server & Client Configuration

See [COMPONENTS.md](./COMPONENTS.md) for server component setup and client provider details.

## Message Files Structure

### Format

All message files are JSON with nested namespaces:

```json
{
  "namespace": {
    "key": "Translation value",
    "nested": {
      "key": "Nested value"
    }
  }
}
```

### Example (messages/en.json)

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading...",
    "error": "Error"
  },
  "navigation": {
    "home": "Home",
    "chat": "Chat",
    "breadcrumbs": {
      "dashboard": "Dashboard"
    }
  },
  "auth": {
    "login": "Login",
    "validation": {
      "emailRequired": "Email is required",
      "passwordMinLength": "Password must be at least {min} characters"
    }
  }
}
```

### Namespace Conventions

| Namespace | Purpose | Example Keys |
|-----------|---------|--------------|
| `common` | Universal UI actions | save, cancel, loading, error |
| `navigation` | Links, menus, breadcrumbs | home, chat, dashboard |
| `auth` | Login, signup, validation | login, emailRequired, signup |
| `errors` | Error messages | notFound, unauthorized |
| `{feature}` | Feature-specific | myFeature.title, myFeature.description |

**Rules:**
- Keep `common` minimal (only truly global strings)
- Create feature namespaces for complex domains
- Use nested objects for related strings
- Max nesting depth: 3 levels (`namespace.group.key`)

## Adding a New Language

### Step 1: Update Configuration

Edit `src/i18n/config.ts`:

```typescript
export const locales = ["it", "en", "fr", "de", "es", "pt"] as const; // Add "pt"

export const localeNames: Record<Locale, string> = {
  // ... existing entries ...
  pt: "Português",
};

export const localeFlags: Record<Locale, string> = {
  // ... existing entries ...
  pt: "🇵🇹",
};
```

### Step 2: Create Message File

Create `messages/pt.json` with all keys from another language file as template:

```bash
cp messages/en.json messages/pt.json
```

Then translate all values in the new file.

### Step 3: Validate

```bash
npm run typecheck    # Verify all languages have same keys
npm run build        # Build with new language
```

## Key Files Reference

| File | Responsibility |
|------|-----------------|
| `src/i18n/config.ts` | Locale constants, names, flags |
| `src/i18n/request.ts` | Server message loading |
| `src/i18n/routing.ts` | Route generation |
| `src/i18n/types.ts` | TypeScript types for messages |
| `src/i18n/index.ts` | Public API exports |
| `src/i18n/locale-provider.tsx` | Client context provider |
| `messages/{locale}.json` | Translations for each language |

## Type Safety

With proper TypeScript configuration, you get:
- Autocomplete for namespace names
- Autocomplete for keys within namespaces
- Type checking for interpolation variables
- Error messages for missing keys

Run type checking:

```bash
npm run typecheck
```

This validates all translation keys exist across all languages.

## Environment & Build

The i18n setup works seamlessly with Next.js:

- **Dev server:** `npm run dev` - Hot reload for translations
- **Build:** `npm run build` - Validates all keys during build
- **Type checking:** `npm run typecheck` - Ensures consistency

See [GUIDE.md](./GUIDE.md) for adding new translation keys.
