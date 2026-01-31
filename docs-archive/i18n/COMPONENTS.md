# Server vs Client Component Patterns

## Quick Reference

| Pattern              | Type   | When                     | Code                                          |
| -------------------- | ------ | ------------------------ | --------------------------------------------- |
| `useTranslations()`  | Client | Interactive components   | `const t = useTranslations("ns")`             |
| `getTranslations()`  | Server | Static content, metadata | `const t = await getTranslations("ns")`       |
| `useLocaleContext()` | Client | Language switching       | `const { switchLocale } = useLocaleContext()` |

## Server Components (Recommended for Content)

Use `getTranslations()` for static translations:

```tsx
// app/[locale]/page.tsx
import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("home");
  return <h1>{t("appTitle")}</h1>;
}
```

### With Variables

```tsx
export async function UserGreeting({ userName }: Props) {
  const t = await getTranslations("common");
  return <h2>{t("welcomeUser", { name: userName })}</h2>;
}
```

### Document Metadata

```tsx
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return {
    title: t("appTitle"),
    description: t("description"),
  };
}
```

### Multiple Namespaces

```tsx
export default async function Page() {
  const tCommon = await getTranslations("common");
  const tNav = await getTranslations("navigation");

  return (
    <>
      <h1>{tCommon("welcome")}</h1>
      <nav>
        <a href="/">{tNav("home")}</a>
      </nav>
    </>
  );
}
```

## Client Components (For Interaction)

Use `useTranslations()` hook for interactive features:

```tsx
"use client";
import { useTranslations } from "next-intl";

export function SaveButton() {
  const t = useTranslations("common");

  return <button onClick={handleSave}>{t("save")}</button>;
}
```

### Form with Validation

```tsx
"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function LoginForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setError(t("emailInvalid"));
      return;
    }
    // Submit...
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder={t("emailPlaceholder")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && <span className="error">{error}</span>}
      <button type="submit">{t("login")}</button>
    </form>
  );
}
```

## Hybrid Pattern (Best Practice)

Server parent + client children:

```tsx
// ✓ Server Component
import { getTranslations } from "next-intl/server";
import { InteractiveForm } from "./form";

export default async function Page() {
  const t = await getTranslations("home");

  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      <InteractiveForm /> {/* Client component */}
    </div>
  );
}

// ✓ Client Component
("use client");
import { useTranslations } from "next-intl";

export function InteractiveForm() {
  const t = useTranslations("auth");
  return (
    <form>
      <input placeholder={t("emailPlaceholder")} />
      <button>{t("submit")}</button>
    </form>
  );
}
```

## Locale Switching

### Basic Switcher

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
        <option key={loc} value={loc}>
          {localeNames[loc]}
        </option>
      ))}
    </select>
  );
}
```

### With Flag Buttons

```tsx
"use client";
import { useLocaleContext } from "@/i18n/locale-provider";

export function LanguageMenu() {
  const { locale, locales, localeFlags, switchLocale } = useLocaleContext();

  return (
    <div className="flex gap-2">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          className={locale === loc ? "active" : ""}
          aria-label={`Switch to ${loc}`}
        >
          {localeFlags[loc]}
        </button>
      ))}
    </div>
  );
}
```

## Layout Structure

See [SETUP.md](./SETUP.md) for complete layout configuration.

## Error Handling

See [EXAMPLES.md](./EXAMPLES.md) for error translation patterns.

## References

- [Translation Hooks Reference](./HOOKS.md)
- [Adding Translation Keys](./GUIDE.md)
- [Setup & Configuration](./SETUP.md)
- [Examples & Troubleshooting](./EXAMPLES.md)
