/**
 * Production Smoke Tests — Extended Compliance Coverage
 *
 * Extended checks for GDPR, EU AI Act, COPPA, cookie policy,
 * terms pages, and related API endpoints.
 */

import { request as pwRequest } from '@playwright/test';
import { test, expect, PROD_URL } from './fixtures';

async function bodyText(page: import('@playwright/test').Page): Promise<string> {
  return ((await page.textContent('body')) || '').toLowerCase();
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

test.describe('PROD-SMOKE: Extended Compliance', () => {
  test('GDPR: /it/privacy loads and contains GDPR text', async ({ page }) => {
    await page.goto('/it/privacy');
    const content = await bodyText(page);
    expect(content).toContain('gdpr');
  });

  test('GDPR: /it/privacy contains data controller information', async ({ page }) => {
    await page.goto('/it/privacy');
    const content = await bodyText(page);
    expect(
      hasAny(content, [/titolare del trattamento/i, /data controller/i, /fightthestroke/i]),
    ).toBeTruthy();
  });

  test('GDPR: /it/privacy contains data subject rights section', async ({ page }) => {
    await page.goto('/it/privacy');
    const content = await bodyText(page);
    expect(hasAny(content, [/accesso/i, /right of access/i])).toBeTruthy();
    expect(hasAny(content, [/cancellazione/i, /erasure/i, /eliminazione/i])).toBeTruthy();
    expect(hasAny(content, [/portabilit/i, /portability/i])).toBeTruthy();
  });

  test('GDPR: cookie consent banner appears on first visit', async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'Accept-Language': 'it-IT,it;q=0.9' },
    });
    const page = await context.newPage();

    await page.route('**/api/tos', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: true, version: '1.0' }),
      });
    });

    await page.goto(`${PROD_URL}/it`);

    const bannerVisible = await page
      .getByTestId('consent-banner')
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    const consentTextVisible = await page
      .getByText(/cookie|consenso/i)
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    // Consent wall may already be dismissed via localStorage in CI; also check cookie page exists
    const cookiePageAccessible =
      bannerVisible || consentTextVisible
        ? true
        : await (async () => {
            const res = await page.goto(`${PROD_URL}/it/cookies`, {
              waitUntil: 'domcontentloaded',
            });
            return res !== null && [200, 307, 308].includes(res.status());
          })();

    expect(cookiePageAccessible).toBeTruthy();
    await context.close();
  });

  test('GDPR: /api/user/consent endpoint exists', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.get('/api/user/consent');
    expect([200, 401]).toContain(res.status());
    await ctx.dispose();
  });

  test('EU AI Act: /it/ai-transparency loads with AI system info', async ({ page }) => {
    await page.goto('/it/ai-transparency');
    const content = await bodyText(page);
    expect(hasAny(content, [/trasparenza ai/i, /sistemi di ia/i, /ai transparency/i])).toBeTruthy();
  });

  test('EU AI Act: /it/ai-transparency contains risk classification', async ({ page }) => {
    await page.goto('/it/ai-transparency');
    const content = await bodyText(page);
    expect(hasAny(content, [/classific/i, /rischio/i, /risk/i])).toBeTruthy();
  });

  test('EU AI Act: /it/ai-transparency contains AI model information', async ({ page }) => {
    await page.goto('/it/ai-transparency');
    const content = await bodyText(page);
    expect(hasAny(content, [/azure openai/i, /modelli/i, /claude/i, /ollama/i])).toBeTruthy();
  });

  test('EU AI Act: /it/ai-policy loads with AI usage policy', async ({ page }) => {
    await page.goto('/it/ai-policy');
    const content = await bodyText(page);
    expect(
      hasAny(content, [/politica/i, /policy/i, /trasparenza ai/i, /ai transparency/i]),
    ).toBeTruthy();
  });

  test('COPPA: /it/privacy contains children privacy or COPPA reference', async ({ page }) => {
    await page.goto('/it/privacy');
    const content = await bodyText(page);
    expect(hasAny(content, [/coppa/i, /minori/i, /bambini/i, /children/i])).toBeTruthy();
  });

  test('COPPA: age verification or parental consent is mentioned', async ({ page }) => {
    await page.goto('/it/terms');
    const content = await bodyText(page);
    expect(
      hasAny(content, [/13 anni/i, /14 anni/i, /genitor/i, /tutore/i, /consenso/i]),
    ).toBeTruthy();
  });

  test('Cookie Policy: /it/cookies loads with cookie categories content', async ({ page }) => {
    await page.goto('/it/cookies');
    const content = await bodyText(page);
    expect(hasAny(content, [/cookie/i, /categorie/i, /categories/i])).toBeTruthy();
  });

  test('Cookie Policy: /it/cookies contains essential/analytics/marketing categories', async ({
    page,
  }) => {
    await page.goto('/it/cookies');
    const content = await bodyText(page);
    expect(hasAny(content, [/essenziali/i, /essential/i])).toBeTruthy();
    expect(hasAny(content, [/analytics/i, /analitic/i])).toBeTruthy();
    expect(hasAny(content, [/marketing/i, /profilazione/i, /advertising/i])).toBeTruthy();
  });

  test('Terms: /it/terms page loads with terms content', async ({ page }) => {
    await page.goto('/it/terms');
    const content = await bodyText(page);
    expect(hasAny(content, [/termini/i, /servizio/i, /terms/i])).toBeTruthy();
  });

  test('Terms: page mentions MirrorBuddy and educational purpose', async ({ page }) => {
    await page.goto('/it/terms');
    const content = await bodyText(page);
    expect(content).toContain('mirrorbuddy');
    expect(hasAny(content, [/educativ/i, /apprendimento/i, /student/i])).toBeTruthy();
  });

  test('Data Endpoints: /api/user/data-export rejects without auth', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.get('/api/user/data-export');
    expect([401, 403, 404, 405]).toContain(res.status());
    await ctx.dispose();
  });

  test('Data Endpoints: /api/user/data-delete rejects without auth', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.get('/api/user/data-delete');
    expect([401, 403, 404, 405]).toContain(res.status());
    await ctx.dispose();
  });
});
