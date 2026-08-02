/**
 * Production Smoke Tests — Current Home Navigation
 */

import {
  authenticatedTest as test,
  expect,
  hasProdTestAuthCookie,
  openMobileMenu,
} from './fixtures';

test.describe('PROD-SMOKE: Navigation', () => {
  test.skip(!hasProdTestAuthCookie, 'Production test auth cookie is not available');

  test.beforeEach(async ({ page }) => {
    await page.goto('/it');
  });

  test('Child navigation exposes the current three destinations', async ({ page }) => {
    await openMobileMenu(page);
    await expect(page.getByTestId('home-nav-intent')).toContainText(/Casa/i);
    await expect(page.getByTestId('home-nav-supporti')).toContainText(/I miei lavori/i);
    await expect(page.getByTestId('home-nav-progress')).toContainText(/I miei premi/i);
  });

  test('Intent chooser exposes all current actions', async ({ page }) => {
    await expect(page.getByTestId('intent-card-homework')).toContainText('Fare i compiti');
    await expect(page.getByTestId('intent-card-study')).toContainText('Studiare');
    await expect(page.getByTestId('intent-card-quizMe')).toContainText('Mettiti alla prova');
  });

  test('Navigating away and back restores the intent chooser', async ({ page }) => {
    await openMobileMenu(page);
    await page.getByTestId('home-nav-supporti').click();
    await expect(page.locator('#intent-heading')).toHaveCount(0);
    await openMobileMenu(page);
    await page.getByTestId('home-nav-intent').click();
    await expect(page.locator('#intent-heading')).toBeVisible();
  });

  test('Home shows current level information', async ({ page }) => {
    await expect(
      page
        .getByRole('banner')
        .getByText(/Lv\.\d/)
        .first(),
    ).toBeVisible();
  });
});
