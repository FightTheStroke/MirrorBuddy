# E2E Locale Testing Fixtures

Comprehensive fixtures and helpers for testing internationalization (i18n) in MirrorBuddy E2E tests.

## Overview

These fixtures provide:

- **Locale-aware page navigation** - Navigate to pages with locale prefixes
- **Accept-Language header mocking** - Simulate different browser languages
- **NEXT_LOCALE cookie handling** - Test user preference persistence
- **Custom matchers** - Assert page locale and content
- **Helper utilities** - Common patterns for locale testing

## Quick Start

### Basic Usage

```typescript
import { test, expect } from './fixtures';

test('should display Italian home page', async ({ localePage }) => {
  await localePage.goto('/home');
  await expect(localePage.page).toHaveLocale('it');
});
```

### Test All Locales

```typescript
import { testAllLocales } from './fixtures';

testAllLocales('should load home page', async ({ localePage }) => {
  await localePage.goto('/home');
  await expect(localePage.page).toHaveLocale(localePage.locale);
});
```

### Test Specific Locale

```typescript
import { testLocale } from './fixtures';

testLocale('en', 'should display English content', async ({ localePage }) => {
  await localePage.goto('/chat');
  await expect(localePage.page).toHaveLocale('en');
});
```

## Fixtures

### `localePage`

Locale-aware page wrapper that provides navigation with automatic locale prefixing.

```typescript
test('navigate with locale', async ({ localePage }) => {
  // Automatically navigates to /it/home
  await localePage.goto('/home');

  // Get current locale
  const locale = await localePage.getCurrentLocale();
  console.log(`Current locale: ${locale}`);

  // Wait for locale to be applied
  await localePage.waitForLocaleLoad();
});
```

### `localeOptions`

Configure locale behavior for your test.

```typescript
test.use({
  localeOptions: {
    locale: 'en',
    acceptLanguage: 'en-US,en;q=0.9',
    setLocaleCookie: true,
  },
});

test('test with English locale', async ({ localePage }) => {
  await localePage.goto('/home');
  // Page will be in English
});
```

## Custom Matchers

### `toHaveLocale()`

Assert that a page is in the expected locale.

```typescript
test('verify page locale', async ({ page }) => {
  await page.goto('/it/home');
  await expect(page).toHaveLocale('it');
});
```

Checks:
- HTML `lang` attribute
- URL locale prefix
- NEXT_LOCALE cookie (if set)

### `toHaveLocaleText()`

Assert that an element contains locale-specific text.

```typescript
test('verify translated content', async ({ page }) => {
  await page.goto('/it/home');
  const heading = page.locator('h1');
  await expect(heading).toHaveLocaleText('Benvenuto');
});
```

## Helper Functions

### Navigation Helpers

```typescript
import { buildLocalizedPath, extractLocaleFromUrl } from './fixtures';

// Build localized URL
const path = buildLocalizedPath('it', '/home'); // '/it/home'

// Extract locale from URL
const locale = extractLocaleFromUrl('/en/chat'); // 'en'
```

### Verification Helpers

```typescript
import { verifyPageLocale, waitForLocale } from './fixtures';

// Detailed verification
const verification = await verifyPageLocale(page, 'it');
console.log(verification);
// {
//   locale: 'it',
//   htmlLang: 'it',
//   urlContainsLocale: true,
//   cookieValue: null,
//   isValid: true,
//   errors: []
// }

// Wait for locale to be applied
await waitForLocale(page, 'en', 5000);
```

### Cookie Helpers

```typescript
import { setLocaleCookie, getLocaleCookie, clearLocaleCookie } from './fixtures';

// Set user preference
await setLocaleCookie(page, 'en');

// Get current preference
const locale = await getLocaleCookie(page); // 'en'

// Clear preference
await clearLocaleCookie(page);
```

### Content Matchers

```typescript
import { contentMatchers } from './fixtures';

const heading = page.locator('h1');

// Check for Italian content
const isItalian = await contentMatchers.hasItalianText(heading);

// Check for English content
const isEnglish = await contentMatchers.hasEnglishText(heading);
```

## Testing Patterns

### Pattern 1: Test Page in All Locales

```typescript
import { localePatterns } from './fixtures';

test('all locales work', async ({ page }) => {
  await localePatterns.testPageInAllLocales(
    page,
    '/home',
    async (locale) => {
      // Custom verification for each locale
      const title = await page.title();
      expect(title).toBeTruthy();
    }
  );
});
```

### Pattern 2: Test Locale Persistence

```typescript
test('locale persists across navigation', async ({ page }) => {
  await localePatterns.testLocalePersistence(page, 'it', [
    '/home',
    '/chat',
    '/settings',
  ]);
});
```

### Pattern 3: Test Locale Switching

```typescript
test('user can switch locales', async ({ page }) => {
  await localePatterns.testLocaleSwitching(
    page,
    'it',  // from
    'en',  // to
    '/home'
  );
});
```

## Real World Examples

### Example 1: User from Italy

```typescript
test('Italian user visits site', async ({ page, context }) => {
  // Simulate Italian browser
  await context.setExtraHTTPHeaders({
    'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  });

  await page.goto('/it/home');
  await expect(page).toHaveLocale('it');
});
```

### Example 2: User Preference Override

```typescript
test('user preference overrides browser language', async ({ page, context }) => {
  // Browser sends Italian
  await context.setExtraHTTPHeaders({
    'Accept-Language': 'it-IT,it;q=0.9',
  });

  // But user prefers English
  await setLocaleCookie(page, 'en');

  await page.goto('/en/home');
  await expect(page).toHaveLocale('en');
});
```

### Example 3: Navigate Between Locales

```typescript
test('navigate between locale versions', async ({ page }) => {
  // Start in Italian
  await page.goto('/it/chat');
  await expect(page).toHaveLocale('it');

  // Switch to English
  await page.goto('/en/chat');
  await expect(page).toHaveLocale('en');

  // Switch to French
  await page.goto('/fr/chat');
  await expect(page).toHaveLocale('fr');
});
```

## Supported Locales

| Code | Language | Accept-Language Header |
|------|----------|------------------------|
| `it` | Italiano | `it-IT,it;q=0.9,en;q=0.8` |
| `en` | English | `en-US,en;q=0.9` |
| `fr` | Français | `fr-FR,fr;q=0.9,en;q=0.8` |
| `de` | Deutsch | `de-DE,de;q=0.9,en;q=0.8` |
| `es` | Español | `es-ES,es;q=0.9,en;q=0.8` |

## API Reference

### Fixtures

- `localePage: LocalePage` - Locale-aware page wrapper
- `localeOptions: LocaleFixtureOptions` - Configure locale behavior

### Test Helpers

- `testLocale(locale, name, fn)` - Run test in specific locale
- `testAllLocales(name, fn)` - Run test in all locales

### Custom Matchers

- `expect(page).toHaveLocale(locale)` - Assert page locale
- `expect(locator).toHaveLocaleText(text)` - Assert translated text

### Navigation Helpers

- `buildLocalizedPath(locale, path)` - Build localized URL
- `extractLocaleFromUrl(url)` - Extract locale from URL
- `isSupportedLocale(locale)` - Check if locale is supported

### Verification Helpers

- `verifyPageLocale(page, locale)` - Detailed locale verification
- `waitForLocale(page, locale, timeout)` - Wait for locale to load

### Cookie Helpers

- `setLocaleCookie(page, locale)` - Set user preference
- `getLocaleCookie(page)` - Get current preference
- `clearLocaleCookie(page)` - Clear preference

### Patterns

- `localePatterns.testPageInAllLocales(page, path, verifyFn)`
- `localePatterns.testLocalePersistence(page, locale, paths)`
- `localePatterns.testLocaleSwitching(page, from, to, path)`

### Content Matchers

- `contentMatchers.hasItalianText(locator)`
- `contentMatchers.hasEnglishText(locator)`
- `contentMatchers.hasFrenchText(locator)`
- `contentMatchers.hasGermanText(locator)`
- `contentMatchers.hasSpanishText(locator)`

## Best Practices

1. **Use `localePage` fixture for navigation** - It automatically handles locale prefixes
2. **Use `testAllLocales()` for common tests** - Ensures all locales work
3. **Use `verifyPageLocale()` for detailed checks** - Better debugging info
4. **Set Accept-Language header** - Simulate real browser behavior
5. **Test locale persistence** - Ensure locale doesn't change unexpectedly
6. **Test user preferences** - Cookie should override Accept-Language

## Troubleshooting

### Locale not detected

```typescript
// Check detailed verification
const verification = await verifyPageLocale(page, 'it');
console.log(verification.errors);
```

### Cookie not persisting

```typescript
// Verify cookie was set
const cookie = await getLocaleCookie(page);
console.log('Cookie value:', cookie);
```

### Wrong locale after navigation

```typescript
// Wait for locale to be applied
await waitForLocale(page, 'en', 10000);
```

## See Also

- [Playwright Documentation](https://playwright.dev/)
- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [MirrorBuddy i18n Configuration](../../src/i18n/config.ts)
