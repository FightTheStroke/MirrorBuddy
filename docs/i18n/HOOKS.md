# Translation Hooks Reference

## Quick Hook Guide

| Hook | Type | Purpose | Use When |
|------|------|---------|----------|
| `useTranslations()` | Client | Get translations with namespace | In client components |
| `getTranslations()` | Server | Get translations in server components | In server components (async) |
| `useLocale()` | Client | Get current locale string | Need locale for conditionals |
| `useLocaleContext()` | Client | Get locale + switching | Need to switch languages |

## useTranslations() - Basic Hook

Primary hook for accessing translations in client components.

```tsx
"use client";
import { useTranslations } from "next-intl";

export function MyComponent() {
  const t = useTranslations("common");
  return <button>{t("save")}</button>;
}
```

### With Variables

```tsx
const t = useTranslations("auth");
t("passwordMinLength", { min: 8 });
// Output: "Password must be at least 8 characters"
```

### Nested Keys

```tsx
const t = useTranslations("navigation");
t("breadcrumbs.home");  // Access nested objects
```

## useTranslationsGlobal() - Multi-Namespace

Access any namespace without declaring it first.

```tsx
import { useTranslationsGlobal } from "@/hooks/useTranslations";

export function MixedComponent() {
  const t = useTranslationsGlobal();
  return (
    <>
      <button>{t("common.save")}</button>
      <span>{t("navigation.home")}</span>
    </>
  );
}
```

**When to use:** Multiple namespaces in one component

## useCommonTranslations() - Shortcut

Quick access to frequently used common strings.

```tsx
import { useCommonTranslations } from "@/hooks/useTranslations";

export function QuickActions() {
  const { save, cancel, loading } = useCommonTranslations();

  return (
    <>
      <button>{save}</button>
      <button>{cancel}</button>
      <span>{loading}</span>
    </>
  );
}
```

### Available Properties

```
loading, error, success, warning, info, confirm, cancel,
save, delete, edit, add, remove, search, filter, sort,
refresh, close, back, next, previous, submit, reset,
clear, select, yes, no, ok
```

## formatMessage() - Outside Components

Format messages in utilities, API calls, or server code.

```typescript
import { formatMessage } from "@/hooks/useTranslations";

const message = formatMessage(
  "Password must be at least {min} characters",
  { min: 8 }
);
```

### Use Cases

```typescript
// Error messages
const validationError = formatMessage(
  "Invalid {field}",
  { field: "email" }
);

// API responses
const errorMsg = formatMessage(
  "User {userId} not found",
  { userId: 123 }
);
```

## Rich Text with Components

Include React components inside translations.

```json
{
  "common": {
    "acceptTerms": "I accept the <link>terms of service</link>"
  }
}
```

```tsx
const t = useTranslations("common");

t.rich("acceptTerms", {
  link: (chunks) => <a href="/terms">{chunks}</a>,
});
```

## useLocale() - Current Language

Get current locale for conditionals:

```tsx
import { useLocale } from "next-intl";

const locale = useLocale();
const date = new Intl.DateTimeFormat(locale).format(new Date());
```

## useLocaleContext() - Locale Switching

Access locale info and implement language switching.

```tsx
"use client";
import { useLocaleContext } from "@/i18n/locale-provider";
import type { Locale } from "@/i18n/config";

export function LocaleSwitcher() {
  const { locale, locales, localeNames, switchLocale } = useLocaleContext();

  return (
    <select
      value={locale}
      onChange={(e) => switchLocale(e.target.value as Locale)}
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>{localeNames[loc]}</option>
      ))}
    </select>
  );
}
```

### With Flags

```tsx
const { locale, locales, localeFlags, switchLocale } = useLocaleContext();

{locales.map((loc) => (
  <button
    key={loc}
    onClick={() => switchLocale(loc)}
    className={locale === loc ? "active" : ""}
  >
    {localeFlags[loc]}
  </button>
))}
```

## Server Components

Use async `getTranslations()` in server components.

```tsx
import { getTranslations } from "next-intl/server";

export async function PageTitle() {
  const t = await getTranslations("home");
  return <h1>{t("appTitle")}</h1>;
}
```

### Metadata

```tsx
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return {
    title: t("appTitle"),
    description: t("description"),
  };
}
```

## Type Safety

TypeScript provides autocomplete and type checking:

```tsx
const t = useTranslations("auth");
t("login");           // ✓ Valid
t("unknownKey");      // ✗ Type error - key not found
t("common.save");     // ✗ Type error - wrong namespace
```

Type definitions come from `src/i18n/types.ts` generated from your message files.

## Variables & Interpolation

Messages use `{variableName}` format. Variable names are case-sensitive. Use same names in all languages.

```tsx
t("passwordMinLength", { min: 8 }); // "Password must be at least 8 characters"
```

See [GUIDE.md](./GUIDE.md) for examples.

## References

- [Setup & Configuration](./SETUP.md)
- [Adding Translation Keys](./GUIDE.md)
- [Component Patterns](./COMPONENTS.md)
- [Examples & Troubleshooting](./EXAMPLES.md)
