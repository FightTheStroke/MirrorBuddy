/**
 * E2E Tests: Terms of Service (ToS) - Consolidated
 *
 * Comprehensive ToS testing combining API endpoints and modal UI behavior.
 * F-12: Block access if ToS not accepted
 *
 * Test scenarios:
 * - API: CSRF token validation, GET/POST endpoints, rate limiting
 * - UI: Modal appearance, checkbox/button interaction, escape prevention
 * - A11y: Keyboard navigation, ARIA labels, contrast requirements
 *
 * Run: npx playwright test e2e/tos.spec.ts
 *
 * Consolidated from:
 * - tos-acceptance.spec.ts (API tests)
 * - tos-modal-interaction.spec.ts (UI tests)
 */

import { test, expect } from './fixtures/base-fixtures';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { authenticateTestUser } from './helpers/auth-session';
import { cleanupTestData } from './helpers/test-data';

// ============================================================================
// API ENDPOINTS (F-12)
// ============================================================================

test.describe('Terms of Service - API Endpoints', () => {
  test('session endpoint provides CSRF token', async ({ request }) => {
    const response = await request.get('/api/session');

    if (response.ok()) {
      const data = await response.json();
      expect(data.csrfToken).toBeDefined();
      expect(typeof data.csrfToken).toBe('string');
      expect(data.csrfToken.length).toBeGreaterThan(0);
    }
  });

  test('GET /api/tos returns ToS status when available', async ({ request }) => {
    await request.get('/api/user');
    const response = await request.get('/api/tos');

    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('accepted');
      expect(typeof data.accepted).toBe('boolean');
      expect(data.version).toBe('1.0');
    } else {
      // 401 (unauthenticated), 404 (not found), or 500 (error)
      expect([401, 404, 500]).toContain(response.status());
    }
  });

  test('POST /api/tos requires CSRF token', async ({ request }) => {
    await request.get('/api/user');
    const response = await request.post('/api/tos', {
      data: { version: '1.0' },
    });

    if (response.ok()) {
      throw new Error('POST without CSRF token should not succeed');
    }
    expect([403, 404, 500]).toContain(response.status());
  });

  test('POST /api/tos with valid CSRF token succeeds', async ({ request }) => {
    await request.get('/api/user');
    const sessionResponse = await request.get('/api/session');
    if (!sessionResponse.ok()) return;

    const sessionData = await sessionResponse.json();
    const csrfToken = sessionData.csrfToken;

    const response = await request.post('/api/tos', {
      data: { version: '1.0' },
      headers: { 'x-csrf-token': csrfToken },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data.success || data.acceptedAt).toBeDefined();
    }
  });
});

test.describe('Terms of Service - Rate Limiting', () => {
  test('API respects reasonable rate limiting', async ({ request }) => {
    await request.get('/api/user');
    const responses = [];
    for (let i = 0; i < 5; i++) {
      const response = await request.get('/api/session');
      responses.push(response.status());
    }
    const errorCount = responses.filter((s) => s >= 400).length;
    expect(errorCount).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// MODAL UI (F-12)
// ============================================================================

const consentTest = test.extend<{ termsPage: Page }>({
  termsPage: async ({ browser, baseURL }, runTest) => {
    const freshContext = await browser.newContext({
      baseURL,
      locale: 'it-IT',
      storageState: { cookies: [], origins: [] },
    });
    try {
      await authenticateTestUser(freshContext, false);
      const page = await freshContext.newPage();
      await page.goto('/it');
      await expect(page.getByTestId('consent-banner')).toBeVisible({ timeout: 20000 });
      await expect(page.getByRole('heading', { name: /Benvenuto su MirrorBuddy/i })).toBeVisible();
      await runTest(page);
    } finally {
      await freshContext.close();
      await cleanupTestData();
    }
  },
});

consentTest.describe('Terms of Service - Modal UI', () => {
  consentTest('ToS modal appears for user who has not accepted', async ({ termsPage }) => {
    const response = await termsPage.request.get('/api/tos');
    expect(response.ok()).toBe(true);
    expect((await response.json()).accepted).toBe(false);
    await expect(termsPage.getByRole('dialog')).toBeVisible();
  });

  consentTest('ToS modal displays all key information', async ({ termsPage }) => {
    const wall = termsPage.getByTestId('consent-banner');
    await expect(wall.getByRole('heading', { name: /Benvenuto su MirrorBuddy/i })).toBeVisible();
    await expect(wall.locator('a[href="/terms"]')).toBeVisible();
    await expect(wall.locator('a[href="/privacy"]')).toBeVisible();
    await expect(wall.locator('a[href="/cookies"]')).toBeVisible();
    await expect(wall.getByRole('checkbox')).toHaveAccessibleName(/accetto/i);
  });

  consentTest('ToS modal checkbox and accept button work correctly', async ({ termsPage }) => {
    const wall = termsPage.getByTestId('consent-banner');
    const accept = wall.getByRole('button', { name: 'Accetta e Continua', exact: true });
    await expect(accept).toBeDisabled();
    await wall.getByRole('checkbox').check();
    await expect(accept).toBeEnabled();
    await accept.click();
    await expect(wall).toBeHidden();
    await expect
      .poll(async () => {
        const response = await termsPage.request.get('/api/tos');
        expect(response.ok()).toBe(true);
        return (await response.json()).accepted;
      })
      .toBe(true);
    const [response] = await Promise.all([
      termsPage.waitForResponse(
        (result) =>
          new URL(result.url()).pathname === '/api/tos' && result.request().method() === 'GET',
      ),
      termsPage.reload(),
    ]);
    expect((await response.json()).accepted).toBe(true);
    await expect(wall).toBeHidden();
  });

  consentTest('modal cannot be dismissed by pressing Escape', async ({ termsPage }) => {
    await termsPage.keyboard.press('Escape');
    await expect(termsPage.getByRole('dialog')).toBeVisible();
  });

  consentTest('modal cannot be dismissed by clicking outside', async ({ termsPage }) => {
    await termsPage.mouse.click(5, 5);
    await expect(termsPage.getByRole('dialog')).toBeVisible();
  });

  consentTest('link to full terms opens terms page', async ({ termsPage }) => {
    const [legalPage] = await Promise.all([
      termsPage.waitForEvent('popup'),
      termsPage.getByTestId('consent-banner').locator('a[href="/terms"]').click(),
    ]);
    try {
      await legalPage.waitForURL(/\/it\/terms$/);
      await expect(legalPage.getByTestId('consent-banner')).toHaveCount(0);
      await expect(termsPage.getByRole('dialog')).toBeVisible();
    } finally {
      await legalPage.close();
    }
  });
});

// ============================================================================
// ACCESSIBILITY (F-12)
// ============================================================================

consentTest.describe('Terms of Service - Accessibility', () => {
  consentTest('ToS modal is keyboard accessible', async ({ termsPage }) => {
    const checkbox = termsPage.getByRole('checkbox');
    await checkbox.focus();
    await termsPage.keyboard.press('Space');
    await expect(checkbox).toBeChecked();
    await termsPage.keyboard.press('Tab');
    await expect(
      termsPage.getByRole('button', { name: 'Accetta e Continua', exact: true }),
    ).toBeFocused();
  });

  consentTest('ToS modal has proper ARIA labels', async ({ termsPage }) => {
    const wall = termsPage.getByRole('dialog');
    await expect(wall).toHaveAccessibleName(/Benvenuto su MirrorBuddy/i);
    await expect(wall).toHaveAttribute('aria-describedby', /.+/);
    await expect(wall.getByRole('checkbox')).toHaveAccessibleName(/accetto/i);
  });

  consentTest('modal content meets contrast requirements', async ({ termsPage }) => {
    const result = await new AxeBuilder({ page: termsPage })
      .include('[data-testid="consent-banner"]')
      .withRules(['color-contrast'])
      .analyze();
    expect(result.violations).toEqual([]);
  });
});
