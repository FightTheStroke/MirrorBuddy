# i18n Contributing Guide

This guide explains how to add, update, and maintain translations in MirrorBuddy.

## Overview

MirrorBuddy uses a **namespace-based** translation structure (ADR 0082):

```
messages/
├── it/          # Italian (reference locale)
│   ├── common.json
│   ├── auth.json
│   ├── admin.json
│   └── ... (12 files total)
├── en/          # English
├── de/          # German
├── es/          # Spanish
└── fr/          # French
```

## Adding New Translation Keys

### 1. Identify the Correct Namespace

| If your feature is about...             | Use namespace |
| --------------------------------------- | ------------- |
| Global UI (buttons, labels, loading)    | `common`      |
| Login, register, invite flows           | `auth`        |
| Admin dashboard, user management        | `admin`       |
| Chat interface, conversation, voice     | `chat`        |
| Tools (mindmap, quiz, flashcards)       | `tools`       |
| User settings, preferences              | `settings`    |
| Legal/compliance pages (privacy, terms) | `compliance`  |
| Learning features, maestros, coaches    | `education`   |
| Navigation elements (menus, sidebar)    | `navigation`  |
| Error messages, 404, validation         | `errors`      |
| Home page, onboarding, welcome          | `welcome`     |
| Page metadata, SEO                      | `metadata`    |

### 2. Add Key to Italian First

Edit `messages/it/{namespace}.json` and add your key:

```json
{
  "myFeature": {
    "title": "Titolo della funzionalità",
    "description": "Descrizione della funzionalità"
  }
}
```

**Key naming conventions:**

- Use camelCase for keys
- Group related keys under a parent object
- Keep keys descriptive but concise

### 3. Sync Other Locales

Run the sync script to add the key to all other locales:

```bash
npx tsx scripts/i18n-sync-namespaces.ts --add-missing
```

This adds missing keys with `[TRANSLATE]` prefix as a placeholder.

### 4. Translate (or Mark for Translation)

Either translate immediately or leave the `[TRANSLATE]` prefix for later:

```json
// English (translated)
{
  "myFeature": {
    "title": "Feature Title",
    "description": "Feature description"
  }
}

// German (pending translation)
{
  "myFeature": {
    "title": "[TRANSLATE] Titolo della funzionalità",
    "description": "[TRANSLATE] Descrizione della funzionalità"
  }
}
```

## Creating a New Namespace

Only create a new namespace if none of the existing 12 fit your feature.

1. **Create the Italian file first:**

   ```bash
   touch messages/it/my-namespace.json
   echo '{}' > messages/it/my-namespace.json
   ```

2. **Add namespace to configuration:**
   Edit `src/i18n/request.ts` and add to `NAMESPACES` array:

   ```typescript
   const NAMESPACES = [
     "common",
     "auth",
     // ...existing...
     "my-namespace", // Add here
   ] as const;
   ```

3. **Add to split script:**
   Edit `scripts/i18n-split.ts` and add mapping:

   ```typescript
   const NAMESPACE_MAPPING: Record<string, string> = {
     // ...existing...
     myNamespace: "my-namespace",
   };
   ```

4. **Add to sync script:**
   Edit `scripts/i18n-sync-namespaces.ts` and add to `NAMESPACES` array.

5. **Run sync:**

   ```bash
   npx tsx scripts/i18n-sync-namespaces.ts --add-missing
   ```

6. **Update this guide** with the new namespace.

## Using Translations in Code

```typescript
import { useTranslations } from 'next-intl';

function MyComponent() {
  // Access any namespace - they're all merged at runtime
  const t = useTranslations('myFeature');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

For nested keys:

```typescript
const t = useTranslations("home.navigation");
// Accesses home.navigation.* keys
```

## Verification Commands

```bash
# Check all locales are in sync
npx tsx scripts/i18n-sync-namespaces.ts

# Run i18n tests
npm run test:unit -- i18n

# Full validation
npm run lint && npm run typecheck && npm run build
```

## Best Practices

### DO:

- Always add keys to Italian first (reference locale)
- Use descriptive, hierarchical key names
- Group related translations under parent objects
- Run sync script after adding new keys
- Test with multiple locales enabled

### DON'T:

- Don't edit non-Italian files manually (use sync script)
- Don't delete keys without checking all usages
- Don't use interpolation syntax incorrectly (`{count}` not `{{count}}`)
- Don't hardcode text in components - always use translations

## Interpolation and Plurals

### Simple Interpolation

```json
{
  "greeting": "Ciao {name}!"
}
```

```typescript
t("greeting", { name: "Mario" }); // "Ciao Mario!"
```

### Plural Forms

```json
{
  "itemCount": "{count, plural, =0 {Nessun elemento} one {# elemento} other {# elementi}}"
}
```

```typescript
t("itemCount", { count: 0 }); // "Nessun elemento"
t("itemCount", { count: 1 }); // "1 elemento"
t("itemCount", { count: 5 }); // "5 elementi"
```

## Finding Unused Keys

To find potentially unused translation keys:

```bash
# List all keys in Italian
cat messages/it/*.json | jq -r 'paths(strings) | join(".")'

# Search for key usage in code
grep -r "t('keyName')" src/
```

## References

- **ADR 0082**: Namespace structure decision
- **docs/i18n/GUIDE.md**: General i18n guide
- **src/i18n/request.ts**: Namespace loading configuration
- **scripts/i18n-sync-namespaces.ts**: Sync script source
