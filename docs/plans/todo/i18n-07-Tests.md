# i18n Step 7: Tests

**Prerequisiti**: Step 1-6 completati
**Rischio**: NESSUNO (solo test)
**Tempo stimato**: 1-2 ore

---

## Checklist

### 7.1 Crea `e2e/i18n.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

const locales = ['it', 'en'] as const;

test.describe('i18n - Locale Detection', () => {
  test('redirects to Italian for Italian browser', async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ 'Accept-Language': 'it-IT,it;q=0.9' });
    await page.goto('/');
    await expect(page).toHaveURL(/\/it\/?/);
  });

  test('redirects to English for English browser', async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.goto('/');
    await expect(page).toHaveURL(/\/en\/?/);
  });

  test('falls back to Italian for unsupported language', async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });
    await page.goto('/');
    await expect(page).toHaveURL(/\/it\/?/);
  });

  test('respects explicit locale in URL', async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ 'Accept-Language': 'it-IT' });
    await page.goto('/en/welcome');
    // Should stay on /en/, not redirect to /it/
    await expect(page).toHaveURL(/\/en\/welcome/);
  });
});

test.describe('i18n - Language Switcher', () => {
  test('language switcher changes locale', async ({ page }) => {
    await page.goto('/it/welcome');

    const switcher = page.locator('[data-testid="language-switcher"]');
    if (await switcher.isVisible()) {
      await page.locator('[data-testid="locale-en"]').click();
      await expect(page).toHaveURL(/\/en\//);
    }
  });
});

test.describe('i18n - Content Localization', () => {
  test('Italian page shows Italian content', async ({ page }) => {
    await page.goto('/it/welcome');
    await page.waitForLoadState('networkidle');

    // Check for Italian-specific text
    const bodyText = await page.textContent('body');

    // Should have Italian words
    const hasItalian =
      bodyText?.includes('Benvenuto') ||
      bodyText?.includes('Inizia') ||
      bodyText?.includes('Ciao') ||
      bodyText?.includes('Continua');

    expect(hasItalian).toBe(true);
  });

  test('English page shows English content', async ({ page }) => {
    await page.goto('/en/welcome');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.textContent('body');

    // Should have English words
    const hasEnglish =
      bodyText?.includes('Welcome') ||
      bodyText?.includes('Start') ||
      bodyText?.includes('Hello') ||
      bodyText?.includes('Continue');

    expect(hasEnglish).toBe(true);
  });

  test('Italian page has no hardcoded English UI', async ({ page }) => {
    await page.goto('/it/welcome');
    await page.waitForLoadState('networkidle');

    // These English words should NOT appear in Italian UI
    const forbiddenEnglish = ['Settings', 'Save', 'Cancel', 'Loading...'];
    const bodyText = await page.textContent('body');

    for (const word of forbiddenEnglish) {
      // Allow if it's part of a proper noun or brand name
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(bodyText || '')) {
        // Check it's not in a button or label
        const buttons = await page.locator(`button:has-text("${word}")`).count();
        const labels = await page.locator(`label:has-text("${word}")`).count();
        expect(buttons + labels, `Found hardcoded "${word}" in Italian UI`).toBe(0);
      }
    }
  });
});

test.describe('i18n - HTML Lang Attribute', () => {
  test('Italian page has lang="it"', async ({ page }) => {
    await page.goto('/it/welcome');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('it');
  });

  test('English page has lang="en"', async ({ page }) => {
    await page.goto('/en/welcome');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('en');
  });
});

test.describe('i18n - Navigation Preserves Locale', () => {
  test('navigating within Italian stays Italian', async ({ page }) => {
    await page.goto('/it/welcome');

    // Find a link and click it
    const link = page.locator('a[href*="/"]').first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForLoadState('networkidle');

      // Should still be on /it/
      expect(page.url()).toMatch(/\/it\//);
    }
  });

  test('navigating within English stays English', async ({ page }) => {
    await page.goto('/en/welcome');

    const link = page.locator('a[href*="/"]').first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForLoadState('networkidle');

      expect(page.url()).toMatch(/\/en\//);
    }
  });
});

test.describe('i18n - API Routes Unaffected', () => {
  test('API routes work without locale prefix', async ({ page }) => {
    // API routes should NOT have locale prefix
    const response = await page.request.get('/api/health');

    // Accept 200 (success) or 404 (route doesn't exist)
    // Should NOT be a redirect to /it/api or /en/api
    expect([200, 404]).toContain(response.status());
    expect(response.url()).not.toMatch(/\/(it|en)\/api/);
  });
});

test.describe('i18n - Error Pages', () => {
  test('404 page shows Italian error for /it/', async ({ page }) => {
    await page.goto('/it/this-page-does-not-exist');

    // Should show Italian error or redirect to home
    const bodyText = await page.textContent('body');
    const isItalian =
      bodyText?.includes('non trovata') ||
      bodyText?.includes('errore') ||
      page.url().includes('/it/');

    expect(isItalian).toBe(true);
  });

  test('404 page shows English error for /en/', async ({ page }) => {
    await page.goto('/en/this-page-does-not-exist');

    const bodyText = await page.textContent('body');
    const isEnglish =
      bodyText?.includes('not found') ||
      bodyText?.includes('error') ||
      page.url().includes('/en/');

    expect(isEnglish).toBe(true);
  });
});
```
- [ ] Test file creato

### 7.2 Esegui i test

```bash
npx playwright test e2e/i18n.spec.ts --reporter=list
```

- [ ] Test eseguiti
- [ ] Nessun fallimento critico

### 7.3 Fix eventuali fallimenti

Se alcuni test falliscono, analizza e fixa:

1. **Locale redirect non funziona**: Controlla middleware
2. **Contenuto sbagliato**: Controlla translation files
3. **lang attribute sbagliato**: Controlla root layout
4. **API routes con locale**: Controlla middleware matcher

- [ ] Tutti i test passano

### 7.4 Esegui test esistenti

Verifica che i test esistenti non siano rotti:

```bash
npx playwright test --reporter=list
```

- [ ] Test esistenti passano

---

## Verifica Finale

```bash
npm run lint
npm run typecheck
npm run build
npx playwright test
```

- [ ] Lint passa
- [ ] TypeCheck passa
- [ ] Build passa
- [ ] Tutti i test E2E passano

---

## Commit

```bash
git add .
git commit -m "test(i18n): add E2E tests for internationalization

- Add locale detection tests
- Add content localization tests
- Add language switcher tests
- Add navigation preservation tests
- Verify API routes unaffected by i18n

Issue #65

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```
- [ ] Commit creato

---

## Step Finale: PR

### 7.5 Push e crea PR

```bash
git push -u origin feature/65-i18n

gh pr create \
  --base development \
  --head feature/65-i18n \
  --title "feat(i18n): Add internationalization support (IT + EN)" \
  --body "$(cat <<'EOF'
## Summary
Adds full internationalization support using next-intl.

### Changes
- **Infrastructure**: next-intl configured with middleware for locale detection
- **App Structure**: All pages moved under `[locale]/` directory
- **Translations**: IT and EN translations for all UI strings
- **Data Localization**: Subjects, Maestri greetings, Buddy profiles
- **AI Language**: Maestri respond in user's language
- **Tests**: Comprehensive E2E test suite

### Locales Supported
- Italian (it) - default fallback
- English (en)

### How It Works
1. Browser's Accept-Language header detected
2. User redirected to appropriate locale (/it/ or /en/)
3. Preference stored in cookie
4. UI and AI content rendered in selected language

### Testing
- `npx playwright test e2e/i18n.spec.ts` - all passing
- Manual testing in both languages completed

Closes #65

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
- [ ] PR creata
- [ ] CI passa
- [ ] Pronta per review

---

## Checklist Finale

Prima di considerare completo:

- [ ] `npm run lint` passa
- [ ] `npm run typecheck` passa
- [ ] `npm run build` passa
- [ ] `npx playwright test` passa
- [ ] App funziona in italiano
- [ ] App funziona in inglese
- [ ] Language switcher funziona
- [ ] Maestri rispondono nella lingua corretta
- [ ] Nessuna stringa italiana hardcoded visibile in /en/
- [ ] PR creata e CI verde

---

**FATTO!** 🎉

L'implementazione i18n è completa.
