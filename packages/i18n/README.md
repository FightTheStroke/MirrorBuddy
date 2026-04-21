# @mirrorbuddy/i18n

Shared i18n config (supported locales, default locale) and helpers
(locale detection from Accept-Language headers, locale path routing)
for the MirrorBuddy workspace.

## Status

W3 initial extraction — Group A (zero-dep helpers). next-intl runtime
wrappers (routing, navigation, locale-provider) remain in
`src/i18n/` pending a follow-up extraction.

## Usage

```ts
import {
  locales,
  defaultLocale,
  type Locale,
  isValidLocale,
  detectLocaleFromAcceptLanguage,
  getLocaleFromPath,
  withLocalePath,
} from '@mirrorbuddy/i18n';
```
