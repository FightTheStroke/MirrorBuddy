/**
 * Production Smoke Tests — Full App Verification
 *
 * Focused verification of the current authenticated child home and public,
 * read-only APIs. Legacy professor-grid assertions remain removed; current
 * Astuccio and Study Kit routes are covered with their active UI.
 */

import { request as pwRequest } from '@playwright/test';
import { authenticatedTest, test, expect, PROD_URL, hasProdTestAuthCookie } from './fixtures';

authenticatedTest.describe('PROD: Current authenticated home', () => {
  authenticatedTest.skip(!hasProdTestAuthCookie, 'Production test auth cookie is not available');

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

  authenticatedTest('Astuccio route renders current tool categories', async ({ page }) => {
    const response = await page.goto('/it/astuccio', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/it\/astuccio\/?$/);
    await expect(page.getByRole('heading', { name: 'Astuccio', level: 1 })).toBeVisible();
    for (const category of ['Carica', 'Crea', 'Cerca']) {
      await expect(page.getByRole('heading', { name: category, level: 2 })).toBeVisible();
    }
  });

  authenticatedTest('Study Kit opens from the active Astuccio tool card', async ({ page }) => {
    await page.goto('/it/astuccio');
    await page.getByRole('button', { name: /^Kit di Studio:/i }).click();
    await expect(page.getByRole('heading', { name: 'Kit di Studio' }).first()).toBeVisible();
    await expect(page.getByText(/I miei Kit|Nessun documento/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Nuovo Kit/i })).toBeVisible();
  });

  authenticatedTest('Legacy Study Kit route redirects to Astuccio', async ({ page }) => {
    await page.goto('/it/study-kit');
    await expect(page).toHaveURL(/\/it\/astuccio\/?$/);
    await expect(page.getByRole('heading', { name: 'Astuccio', level: 1 })).toBeVisible();
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
