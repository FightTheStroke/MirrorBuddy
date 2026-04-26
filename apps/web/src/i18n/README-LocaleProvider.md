# LocaleProvider

The LocaleProvider component wraps NextIntlClientProvider and provides locale context to the entire application.

## Features

- Wraps NextIntlClientProvider for message translations
- Provides current locale and available locales via context
- Exposes locale switching capability
- Makes locale information accessible to all components

## Architecture

```
RootLayout (layout.tsx)
└── Providers (ThemeProvider, AccessibilityProvider, etc.)
    └── LocaleLayout ([locale]/layout.tsx)
        └── LocaleProvider
            └── NextIntlClientProvider
                └── App Content
```

## Usage

### In Layout (Already Integrated)

The LocaleProvider is already integrated in `src/app/[locale]/layout.tsx`:

```tsx
import { LocaleProvider } from "@/i18n/locale-provider";

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <LocaleProvider locale={locale} messages={messages}>
      {children}
    </LocaleProvider>
  );
}
```

### In Components

Use the `useLocale` hook to access locale information:

```tsx
import { useLocale } from "@/hooks/use-locale";

function LanguageSwitcher() {
  const { locale, locales, localeNames, localeFlags, switchLocale } =
    useLocale();

  return (
    <select
      value={locale}
      onChange={(e) => switchLocale(e.target.value as Locale)}
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeFlags[loc]} {localeNames[loc]}
        </option>
      ))}
    </select>
  );
}
```

### Available Properties

From `useLocale()`:

- `locale` (string): Current active locale (e.g., "it", "en")
- `locales` (readonly Locale[]): Array of all supported locales
- `defaultLocale` (Locale): Default locale ("it")
- `localeNames` (Record<Locale, string>): Locale display names
- `localeFlags` (Record<Locale, string>): Locale flag emojis
- `switchLocale(locale: Locale)`: Function to switch to a different locale

## Examples

### Simple Language Switcher

```tsx
import { useLocale } from "@/hooks/use-locale";

export function SimpleLanguageSwitcher() {
  const { locale, locales, localeNames, switchLocale } = useLocale();

  return (
    <div className="flex gap-2">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          className={locale === loc ? "font-bold" : ""}
        >
          {localeNames[loc]}
        </button>
      ))}
    </div>
  );
}
```

### Display Current Locale

```tsx
import { useLocale } from "@/hooks/use-locale";

export function CurrentLocaleDisplay() {
  const { locale, localeNames, localeFlags } = useLocale();

  return (
    <div>
      Current language: {localeFlags[locale]} {localeNames[locale]}
    </div>
  );
}
```

### Advanced Switcher with Dropdown

```tsx
import { useLocale } from "@/hooks/use-locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageDropdown() {
  const { locale, locales, localeNames, localeFlags, switchLocale } =
    useLocale();

  return (
    <Select
      value={locale}
      onValueChange={(value) => switchLocale(value as Locale)}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue>
          {localeFlags[locale]} {localeNames[locale]}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {locales.map((loc) => (
          <SelectItem key={loc} value={loc}>
            {localeFlags[loc]} {localeNames[loc]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

## Implementation Details

### LocaleProvider Component

Located in `src/i18n/locale-provider.tsx`:

- Client component that creates a context for locale information
- Wraps NextIntlClientProvider to maintain compatibility with next-intl
- Provides switchLocale function for programmatic locale changes

### useLocale Hook

Located in `src/hooks/use-locale.ts`:

- Combines next-intl's useLocale with custom locale context
- Provides type-safe access to all locale information
- Single hook for all locale-related needs

### Locale Switching

The `switchLocale` function:

1. Gets the current pathname
2. Removes the current locale prefix
3. Constructs a new path with the selected locale
4. Navigates to the new path (triggers full page reload)

This approach ensures:

- Messages are loaded for the new locale
- Server components receive the correct locale
- URL reflects the current locale
- Bookmarks work correctly

## Testing

The provider is tested as part of the build process:

```bash
npm run typecheck  # Verify types
npm run build      # Verify integration
```

## Related Files

- `src/i18n/config.ts` - Locale configuration
- `src/i18n/routing.ts` - Routing configuration
- `src/app/[locale]/layout.tsx` - Integration point
- `src/hooks/use-locale.ts` - Locale hook
- `src/hooks/useTranslations.ts` - Translation hooks
