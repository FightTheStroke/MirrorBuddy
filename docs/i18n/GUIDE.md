# Adding Translation Keys - Step-by-Step Guide

## Quick Checklist

- [ ] Identify the namespace (common, navigation, auth, or feature)
- [ ] Add the same key structure to ALL language files
- [ ] Use the translation in your component
- [ ] Run `npm run typecheck` to verify all keys exist
- [ ] Test in multiple languages before committing

## Step 1: Choose a Namespace

| Namespace | Use For | Examples |
|-----------|---------|----------|
| `common` | Universal UI | save, delete, loading, error |
| `navigation` | Menu & links | home, chat, dashboard |
| `auth` | Login & validation | login, emailRequired |
| `{feature}` | Feature-specific | tools, flashcards, mindmap |

**Rules:**
- Keep `common` minimal
- Create feature namespaces for complex domains
- Max nesting: 3 levels (`namespace.group.key`)

## Step 2: Add to All Message Files

Update **every** language file: it.json, en.json, fr.json, de.json, es.json.

### Simple Key

```json
{
  "common": {
    "share": "Translation text here"
  }
}
```

### With Variables

```json
{
  "auth": {
    "passwordMinLength": "Password must be at least {min} characters"
  }
}
```

Use same variable names in all languages.

### Nested Keys

```json
{
  "navigation": {
    "breadcrumbs": {
      "dashboard": "Dashboard"
    }
  }
}
```

## Step 3: Use in Components

### Client Component

```tsx
"use client";
import { useTranslations } from "next-intl";

export function SaveButton() {
  const t = useTranslations("common");
  return <button>{t("save")}</button>;
}
```

### Server Component

```tsx
import { getTranslations } from "next-intl/server";

export async function PageTitle() {
  const t = await getTranslations("home");
  return <h1>{t("appTitle")}</h1>;
}
```

### With Variables

```tsx
const t = useTranslations("auth");
const errorMsg = t("passwordMinLength", { min: 8 });
// Output: "Password must be at least 8 characters"
```

## Step 4: Validate & Test

### Type Check

```bash
npm run typecheck
```

Verifies:
- All keys exist in all languages
- Variable names match templates
- No typos in namespace or key names

### Test in App

```bash
npm run dev
```

Visit each locale URL and verify translations:
- http://localhost:3000/it
- http://localhost:3000/en
- http://localhost:3000/fr
- http://localhost:3000/de
- http://localhost:3000/es

## Step 5: Commit

```bash
git add messages/
git add src/
git commit -m "feat: add share button translations"
```

## Common Patterns

### Button Labels

```json
{
  "common": {
    "save": "Save",
    "delete": "Delete",
    "cancel": "Cancel"
  }
}
```

### Form Validation

```json
{
  "auth": {
    "validation": {
      "emailRequired": "Email is required",
      "emailInvalid": "Please enter a valid email",
      "passwordMinLength": "Password must be at least {min} characters"
    }
  }
}
```

### Feature Descriptions

```json
{
  "tools": {
    "pdf": {
      "title": "PDF Tool",
      "description": "Upload and analyze PDFs",
      "maxSize": "Maximum file size is {max}MB"
    }
  }
}
```

### Empty States

```json
{
  "common": {
    "empty": "No items yet",
    "noResults": "No results found for '{query}'",
    "tryAgain": "Try again"
  }
}
```

## Best Practices

1. **Use consistent terminology** across namespaces
2. **Keep messages concise** (aim for under 80 characters)
3. **Test in each language** before merging
4. **Use variables** instead of string concatenation
5. **Group related keys** in nested objects
6. **Avoid hardcoding** English text

## Troubleshooting

### Type Error: "Property 'foo' does not exist"

**Problem:** Key missing in message file

**Solution:**
1. Add key to ALL language files
2. Check spelling (case-sensitive)
3. Run `npm run typecheck`

### Text Shows `{key}` Instead of Translation

**Problem:** Key not found in namespace

**Solution:**
1. Verify namespace name: `useTranslations("common")`
2. Check key exists in message file
3. Validate JSON syntax

### Variable Not Replaced

**Problem:** `{min}` appears instead of value

**Solution:**
1. Check variable name in message: `{min}` not `{minimum}`
2. Pass variable in call: `t("key", { min: 8 })`
3. Verify spelling matches exactly

## References

- [Setup & Configuration](./SETUP.md)
- [Translation Hooks](./HOOKS.md)
- [Component Patterns](./COMPONENTS.md)
- [Examples & Troubleshooting](./EXAMPLES.md)
