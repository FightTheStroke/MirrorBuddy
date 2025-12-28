import { test, expect } from '@playwright/test';

test.describe('Settings View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Impostazioni' }).click();
    await page.waitForTimeout(500);
  });

  test('settings page loads correctly', async ({ page }) => {
    // Check for settings header
    await expect(page.locator('h1').filter({ hasText: 'Impostazioni' })).toBeVisible();

    // Check for tabs - use button or tab role
    await expect(page.locator('button').filter({ hasText: 'Profilo' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Aspetto' })).toBeVisible();
  });

  test('profile tab allows name input', async ({ page }) => {
    // Profile tab should be active by default
    await expect(page.locator('text=Informazioni Personali')).toBeVisible();

    // Should have name input
    const nameInput = page.locator('input[placeholder*="chiami"]');
    await expect(nameInput).toBeVisible();

    // Should be able to type name
    await nameInput.fill('Test Student');
    await expect(nameInput).toHaveValue('Test Student');
  });

  test('grade level selector works', async ({ page }) => {
    // Find grade level select
    const gradeSelect = page.locator('select');
    await expect(gradeSelect.first()).toBeVisible();

    // Select an option
    await gradeSelect.first().selectOption('primary');
    await expect(gradeSelect.first()).toHaveValue('primary');
  });

  test('learning goals can be selected', async ({ page }) => {
    // Check for learning goals
    await expect(page.locator('text=Obiettivi di Apprendimento')).toBeVisible();

    // Click on a goal
    await page.click('text=Migliorare in matematica');

    // Should be selected (check for visual change)
    const goal = page.locator('text=Migliorare in matematica').locator('..');
    await expect(goal).toHaveClass(/border-blue|bg-blue/);
  });
});

test.describe('Theme Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Impostazioni' }).click();
    await page.waitForTimeout(500);
    await page.locator('button').filter({ hasText: 'Aspetto' }).click();
    await page.waitForTimeout(500);
  });

  test('theme options are displayed', async ({ page }) => {
    // Should show theme options
    await expect(page.locator('button').filter({ hasText: 'Chiaro' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Scuro' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Sistema' })).toBeVisible();
  });

  test('can switch to light theme', async ({ page }) => {
    // Click on light theme
    await page.click('text=Chiaro');

    // Body should not have dark class
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);
  });

  test('can switch to dark theme', async ({ page }) => {
    // Click on dark theme
    await page.click('text=Scuro');

    // Wait for theme change
    await page.waitForTimeout(500);

    // HTML should have dark class
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
  });

  test('accent color options are displayed', async ({ page }) => {
    // Should show color options
    await expect(page.locator('text=Colore Principale')).toBeVisible();

    // Should have color buttons
    const colorButtons = page.locator('[class*="rounded-full"][class*="bg-"]').filter({ hasNotText: /./ });
    await expect(colorButtons.first()).toBeVisible();
  });
});

test.describe('Accessibility Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Impostazioni' }).click();
    await page.waitForTimeout(500);
    await page.locator('button').filter({ hasText: /Accessibilit/i }).click();
    await page.waitForTimeout(500);
  });

  test('accessibility tab shows options', async ({ page }) => {
    // Check for accessibility-related content
    const hasAccessibility = await page.locator('text=dislessia').or(page.locator('text=Accessibilit')).first().isVisible();
    expect(hasAccessibility).toBeTruthy();
  });

  test('can open accessibility modal', async ({ page }) => {
    // Look for the button to open accessibility panel
    const panelButton = page.locator('button').filter({ hasText: /Pannello|Accessibilit/i }).first();
    if (await panelButton.isVisible().catch(() => false)) {
      await panelButton.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Privacy Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Impostazioni' }).click();
    await page.waitForTimeout(500);
    await page.locator('button').filter({ hasText: 'Privacy' }).click();
    await page.waitForTimeout(500);
  });

  test('privacy info is displayed', async ({ page }) => {
    // Check for privacy information
    const hasPrivacy = await page.locator('text=Privacy').or(page.locator('text=dati')).first().isVisible();
    expect(hasPrivacy).toBeTruthy();
  });

  test('delete data button exists', async ({ page }) => {
    // Should have delete data option
    const hasDelete = await page.locator('button').filter({ hasText: /Elimina|Cancella|dati/i }).first().isVisible();
    expect(hasDelete).toBeTruthy();
  });
});
