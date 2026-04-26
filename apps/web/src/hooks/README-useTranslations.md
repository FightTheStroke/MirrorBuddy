# useTranslations Hook

Type-safe translation hook wrapper for next-intl with namespace support and fallback handling.

## Features

- **Type-safe**: Full TypeScript support with autocomplete
- **Namespace support**: Access translations by namespace (e.g., 'common', 'auth', 'errors')
- **Fallback handling**: Gracefully handles missing translations
- **Variable interpolation**: Support for dynamic values in translations
- **Multiple hooks**: Different hooks for different use cases

## Installation

The hook is already configured. Import from `@/i18n` or `@/hooks/useTranslations`:

```tsx
import { useTranslations } from "@/i18n";
// or
import { useTranslations } from "@/hooks/useTranslations";
```

## Basic Usage

### With Namespace

```tsx
import { useTranslations } from "@/i18n";

function MyComponent() {
  const t = useTranslations("common");

  return (
    <div>
      <button>{t("save")}</button>
      <button>{t("cancel")}</button>
      <span>{t("loading")}</span>
    </div>
  );
}
```

### With Variables

```tsx
import { useTranslations } from "@/i18n";

function ValidationMessage() {
  const t = useTranslations("validation");

  return (
    <div>
      <p>{t("minLength", { min: 8 })}</p>
      {/* Renders: "Must be at least 8 characters" */}
      <p>{t("maxLength", { max: 100 })}</p>
      {/* Renders: "Cannot exceed 100 characters" */}
    </div>
  );
}
```

### Nested Keys

```tsx
import { useTranslations } from "@/i18n";

function Breadcrumbs() {
  const t = useTranslations("navigation");

  return (
    <nav>
      {t("breadcrumbs.home")} {t("breadcrumbs.separator")} Products
    </nav>
  );
}
```

## Advanced Usage

### Global Hook (Multiple Namespaces)

When you need to access translations from multiple namespaces in one component:

```tsx
import { useTranslationsGlobal } from "@/i18n";

function MixedComponent() {
  const t = useTranslationsGlobal();

  return (
    <div>
      <button>{t("common.save")}</button>
      <span>{t("auth.login")}</span>
      <p>{t("errors.notFound")}</p>
    </div>
  );
}
```

### Common Translations Hook

Quick access to frequently used common translations:

```tsx
import { useCommonTranslations } from "@/i18n";

function QuickActions() {
  const {
    save,
    cancel,
    loading,
    edit,
    delete: deleteText,
  } = useCommonTranslations();

  return (
    <div>
      <button>{save}</button>
      <button>{cancel}</button>
      <button>{edit}</button>
      <button>{deleteText}</button>
      {isLoading && <span>{loading}</span>}
    </div>
  );
}
```

### Format Message Utility

For formatting messages outside React components (utilities, API calls, etc.):

```tsx
import { formatMessage } from "@/i18n";

function createErrorMessage(minLength: number) {
  return formatMessage("Must be at least {min} characters", { min: minLength });
}

// Usage in API responses
export async function validateInput(input: string) {
  if (input.length < 8) {
    return {
      error: formatMessage("Must be at least {min} characters", { min: 8 }),
    };
  }
}
```

## Available Namespaces

| Namespace       | Purpose                            | Example Keys                      |
| --------------- | ---------------------------------- | --------------------------------- |
| `common`        | Common UI elements                 | save, cancel, loading, edit       |
| `navigation`    | Navigation and menu items          | home, dashboard, settings         |
| `auth`          | Authentication and user management | login, logout, register           |
| `errors`        | Error messages                     | notFound, serverError, validation |
| `accessibility` | Accessibility labels and ARIA      | skipToContent, loading, selected  |
| `validation`    | Form validation messages           | required, email, minLength        |
| `status`        | Status indicators                  | active, pending, completed        |

## Type Safety

All translation keys are type-checked based on the message structure:

```tsx
const t = useTranslations("common");

t("save"); // ✅ Valid - key exists
t("invalidKey"); // ✅ Valid but will warn if missing
```

The hook provides runtime safety with fallback handling for missing translations.

## Fallback Behavior

When a translation is missing:

1. A warning is logged to the console (development mode)
2. The full key path is returned (e.g., "common.missingKey")
3. The app continues to function without crashing

```tsx
const t = useTranslations("common");
t("nonExistentKey"); // Returns: "common.nonExistentKey"
// Console: "Translation missing for key: common.nonExistentKey"
```

## Best Practices

1. **Use specific namespaces** for better code organization:

   ```tsx
   ❌ const t = useTranslationsGlobal();
   ✅ const t = useTranslations('auth');
   ```

2. **Extract common translations** when used multiple times:

   ```tsx
   ✅ const { save, cancel } = useCommonTranslations();
   ```

3. **Use variables** for dynamic content:

   ```tsx
   ✅ t('minLength', { min: 8 })
   ❌ `Must be at least ${min} characters`
   ```

4. **Keep namespace-specific** in components:
   ```tsx
   ✅ One namespace per component when possible
   ❌ Multiple namespaces mixed in one component
   ```

## Migration from Direct next-intl

If you were using next-intl directly:

```tsx
// Before
import { useTranslations } from "next-intl";
const t = useTranslations("common");

// After (same syntax, enhanced features)
import { useTranslations } from "@/i18n";
const t = useTranslations("common");
```

The wrapper is a drop-in replacement with additional type safety and fallback handling.
