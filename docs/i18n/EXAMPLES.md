# Examples & Troubleshooting

## Real-World Scenarios

### Add Translation for New Button

**Step 1: Update all message files**

messages/it.json:
```json
{ "common": { "share": "Condividi" } }
```

messages/en.json:
```json
{ "common": { "share": "Share" } }
```

Repeat for fr.json, de.json, es.json.

**Step 2: Use in component**

```tsx
"use client";
import { useTranslations } from "next-intl";

export function ShareButton() {
  const t = useTranslations("common");

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: "MirrorBuddy" });
    }
  };

  return <button onClick={handleShare}>{t("share")}</button>;
}
```

**Step 3: Validate**

```bash
npm run typecheck && npm run dev
```

### Form Validation with Dynamic Messages

```json
{
  "auth": {
    "validation": {
      "passwordMinLength": "Password must be at least {min} characters",
      "passwordRequired": "Password is required",
      "emailRequired": "Email is required"
    }
  }
}
```

```tsx
"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";

const MIN_PASSWORD_LENGTH = 8;

export function PasswordInput() {
  const t = useTranslations("auth.validation");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleChange = (value: string) => {
    setPassword(value);
    if (!value) {
      setError(t("passwordRequired"));
    } else if (value.length < MIN_PASSWORD_LENGTH) {
      setError(t("passwordMinLength", { min: MIN_PASSWORD_LENGTH }));
    } else {
      setError(null);
    }
  };

  return (
    <>
      <input
        type="password"
        value={password}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t("passwordRequired")}
      />
      {error && <span className="error">{error}</span>}
    </>
  );
}
```

### Locale-Specific Formatting

```tsx
"use client";
import { useLocale } from "next-intl";

export function FormattedData() {
  const locale = useLocale();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: locale === "it" ? "EUR" : "USD",
    }).format(amount);
  };

  return (
    <>
      <p>Today: {formatDate(new Date())}</p>
      <p>Price: {formatCurrency(19.99)}</p>
    </>
  );
}
```

### Language-Conditional Content

```tsx
"use client";
import { useLocale } from "next-intl";

export function LocaleSpecificContent() {
  const locale = useLocale();

  if (locale === "it") {
    return <div className="banner">Benvenuto in MirrorBuddy!</div>;
  }

  return <div className="banner">Welcome to MirrorBuddy!</div>;
}
```

## Troubleshooting

### Error: "Key 'common.share' not found in locale 'en'"

**Diagnosis:** Key exists in one language but not others

**Solution:**
1. Check all message files have the key: `grep -r "share" messages/*.json`
2. Validate JSON syntax: `node -e "require('messages/en.json')"`
3. Run typecheck: `npm run typecheck`

### Error: "Property 'unknownKey' does not exist on type"

**Diagnosis:** Typo in component or key doesn't exist

**Solution:**
```tsx
// ✗ Check if message file has this key
const t = useTranslations("common");
t("unknownKey"); // Must exist in messages/*/common

// ✓ Verify then run typecheck
npm run typecheck
```

### Text Shows `{min}` Instead of `8`

**Diagnosis:** Variable name mismatch or not passed

**Solution:**
```json
{
  "auth": {
    "minLength": "Must be at least {min} characters"
  }
}
```

```tsx
// ✗ Wrong - variable name mismatch
t("minLength", { minimum: 8 });

// ✓ Correct - variable name matches
t("minLength", { min: 8 });
```

### Locale Switching Doesn't Work

**Diagnosis:** Provider missing or switching function not called

**Solution:**
```tsx
"use client";
import { useLocaleContext } from "@/i18n/locale-provider";

export function LanguageSwitcher() {
  const { locale, locales, switchLocale } = useLocaleContext();

  return (
    <select
      value={locale}
      onChange={(e) => switchLocale(e.target.value as Locale)}
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>{loc}</option>
      ))}
    </select>
  );
}
```

## Testing

Wrap components with `NextIntlClientProvider` for unit tests:

```typescript
import { NextIntlClientProvider } from "next-intl";

render(
  <NextIntlClientProvider messages={{ common: { save: "Guardar" } }} locale="es">
    <SaveButton />
  </NextIntlClientProvider>
);
```

Test each locale URL in E2E: `/it`, `/en`, `/fr`, `/de`, `/es`

## Common Patterns

**Plural handling:** Use conditional based on count:
```tsx
const message = count === 1 ? t("singular") : t("plural", { count });
```

**Loading state:** `if (isLoading) return <div>{t("loading")}</div>;`

**Error handling:** `showToast(t("errors.deleteError"), "error");`

## References

- [Setup & Configuration](./SETUP.md)
- [Adding Translation Keys](./GUIDE.md)
- [Translation Hooks](./HOOKS.md)
- [Component Patterns](./COMPONENTS.md)
