/**
 * Production Smoke Tests — Full App Verification
 *
 * Focused verification of the current authenticated child home and public,
 * read-only APIs. Legacy professor-grid and Astuccio landing assertions were
 * removed when the home changed to the intent-based experience.
 */

import { request as pwRequest } from '@playwright/test';
import { authenticatedTest, test, expect, PROD_URL, hasProdTestCredentials } from './fixtures';

authenticatedTest.describe('PROD: Current authenticated home', () => {
  authenticatedTest.skip(
    !hasProdTestCredentials,
    'Local production test credentials are not available',
  );

  authenticatedTest('Loads directly into the intent chooser', async ({ page }) => {
    await page.goto('/it');
    await expect(page).toHaveURL(/\/it\/?$/);
    await expect(page.locator('#intent-heading')).toBeVisible({ timeout: 15000 });
  });

  authenticatedTest('Shows exactly the three supported learning actions', async ({ page }) => {
    await page.goto('/it');
    const cards = page.locator('[data-testid^="intent-card-"]');
    await expect(cards).toHaveCount(3);
    await expect(page.getByTestId('intent-card-homework')).toContainText('Fare i compiti');
    await expect(page.getByTestId('intent-card-study')).toContainText('Studiare');
    await expect(page.getByTestId('intent-card-quizMe')).toContainText('Mettiti alla prova');
  });

  authenticatedTest('Uses the current child navigation labels', async ({ page }) => {
    await page.goto('/it');
    await expect(page.getByTestId('home-nav-intent')).toContainText('Casa');
    await expect(page.getByTestId('home-nav-supporti')).toContainText('I miei lavori');
    await expect(page.getByTestId('home-nav-progress')).toContainText('I miei premi');
  });

  authenticatedTest('Does not expose the retired professor picker on home', async ({ page }) => {
    await page.goto('/it');
    await expect(page.getByRole('searchbox', { name: /Cerca professore/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Studia con /i })).toHaveCount(0);
  });
});

test.describe('PROD: Public API endpoints', () => {
  test('Health endpoint returns a valid status', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(['healthy', 'degraded']).toContain(body.status);
    await ctx.dispose();
  });

  test('PDF generator profiles endpoint returns profiles', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const res = await ctx.get('/api/pdf-generator');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.profiles?.length).toBeGreaterThan(0);
    await ctx.dispose();
  });

  test('Study kit endpoints reject unauthenticated access', async () => {
    const ctx = await pwRequest.newContext({ baseURL: PROD_URL });
    const upload = await ctx.post('/api/study-kit/upload');
    const list = await ctx.get('/api/study-kit');
    expect(upload.status()).toBeGreaterThanOrEqual(400);
    expect(list.status()).toBeGreaterThanOrEqual(400);
    await ctx.dispose();
  });
});
