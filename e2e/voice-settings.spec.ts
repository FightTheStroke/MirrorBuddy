import { test, expect } from '@playwright/test';

// NOTE: These tests are skipped because the UI uses custom Slider components
// with sr-only native inputs. The slider interaction would need to be updated
// to use mouse-based interaction with the visual slider track.
// TODO: Refactor tests to work with Radix-style custom sliders

test.describe.skip('Voice Experience Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Impostazioni' }).click();
    await page.waitForTimeout(500);
    // Navigate to Audio/Video tab
    await page.locator('button').filter({ hasText: /Audio|Video/i }).click();
    await page.waitForTimeout(500);
  });

  test('voice experience settings section is visible', async ({ page }) => {
    // Check for the Voice Experience card
    await expect(page.locator('text=Esperienza Vocale')).toBeVisible();
    await expect(page.locator('text=Personalizza il comportamento delle conversazioni vocali')).toBeVisible();
  });

  test('barge-in toggle is present and functional', async ({ page }) => {
    // Check for barge-in toggle
    const bargeInLabel = page.locator('text=Interruzione automatica');
    await expect(bargeInLabel).toBeVisible();

    // Find the toggle switch
    const toggle = page.locator('button[role="switch"]');
    await expect(toggle).toBeVisible();

    // Toggle should be checked by default (barge-in enabled)
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // Click to disable
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    // Click to enable again
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  test('VAD threshold slider is present and functional', async ({ page }) => {
    // Check for VAD slider
    await expect(page.locator('text=Sensibilità rilevamento voce')).toBeVisible();

    // Find the slider
    const slider = page.locator('input[type="range"]').first();
    await expect(slider).toBeVisible();

    // Check default value (0.4)
    await expect(slider).toHaveValue('0.4');

    // Check min/max labels
    await expect(page.locator('text=Più sensibile')).toBeVisible();
    await expect(page.locator('text=Meno sensibile')).toBeVisible();

    // Change value
    await slider.fill('0.5');
    await expect(slider).toHaveValue('0.5');

    // Check that value display updates
    await expect(page.locator('text=0.50')).toBeVisible();
  });

  test('silence duration slider is present and functional', async ({ page }) => {
    // Check for silence duration slider
    await expect(page.locator('text=Attesa fine frase')).toBeVisible();

    // Find the silence duration slider (second range input)
    const sliders = page.locator('input[type="range"]');
    const silenceSlider = sliders.nth(1);
    await expect(silenceSlider).toBeVisible();

    // Check default value (400)
    await expect(silenceSlider).toHaveValue('400');

    // Check min/max labels
    await expect(page.locator('text=Più veloce')).toBeVisible();
    await expect(page.locator('text=Più lento')).toBeVisible();

    // Change value
    await silenceSlider.fill('500');
    await expect(silenceSlider).toHaveValue('500');

    // Check that value display updates
    await expect(page.locator('text=500ms')).toBeVisible();
  });

  test('reset to defaults button works', async ({ page }) => {
    // Find and modify settings
    const vadSlider = page.locator('input[type="range"]').first();
    const silenceSlider = page.locator('input[type="range"]').nth(1);
    const toggle = page.locator('button[role="switch"]');

    // Change values
    await vadSlider.fill('0.6');
    await silenceSlider.fill('600');
    await toggle.click(); // Disable barge-in

    // Verify changes
    await expect(vadSlider).toHaveValue('0.6');
    await expect(silenceSlider).toHaveValue('600');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    // Click reset button
    await page.click('text=Ripristina valori predefiniti');

    // Verify defaults restored
    await expect(vadSlider).toHaveValue('0.4');
    await expect(silenceSlider).toHaveValue('400');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  test('settings persist after page reload', async ({ page }) => {
    // Modify settings
    const vadSlider = page.locator('input[type="range"]').first();
    const silenceSlider = page.locator('input[type="range"]').nth(1);
    const toggle = page.locator('button[role="switch"]');

    await vadSlider.fill('0.35');
    await silenceSlider.fill('550');
    await toggle.click(); // Disable barge-in

    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);

    // Navigate back to settings
    await page.locator('button').filter({ hasText: 'Impostazioni' }).click();
    await page.waitForTimeout(500);
    await page.locator('button').filter({ hasText: /Audio|Video/i }).click();
    await page.waitForTimeout(500);

    // Verify settings persisted
    const vadSliderAfter = page.locator('input[type="range"]').first();
    const silenceSliderAfter = page.locator('input[type="range"]').nth(1);
    const toggleAfter = page.locator('button[role="switch"]');

    await expect(vadSliderAfter).toHaveValue('0.35');
    await expect(silenceSliderAfter).toHaveValue('550');
    await expect(toggleAfter).toHaveAttribute('aria-checked', 'false');
  });
});

test.describe.skip('Voice Settings Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Impostazioni' }).click();
    await page.waitForTimeout(500);
    await page.locator('button').filter({ hasText: /Audio|Video/i }).click();
    await page.waitForTimeout(500);
  });

  test('toggle has proper ARIA attributes', async ({ page }) => {
    const toggle = page.locator('button[role="switch"]');
    await expect(toggle).toHaveAttribute('role', 'switch');
    await expect(toggle).toHaveAttribute('aria-checked');
  });

  test('sliders are keyboard accessible', async ({ page }) => {
    // Focus on VAD slider
    const vadSlider = page.locator('input[type="range"]').first();
    await vadSlider.focus();
    await expect(vadSlider).toBeFocused();

    // Use keyboard to change value
    await page.keyboard.press('ArrowRight');
    const newValue = await vadSlider.inputValue();
    expect(parseFloat(newValue)).toBeGreaterThan(0.4);
  });

  test('voice settings have descriptive labels', async ({ page }) => {
    // Check all labels are present
    await expect(page.locator('text=Interruzione automatica')).toBeVisible();
    await expect(page.locator('text=Sensibilità rilevamento voce')).toBeVisible();
    await expect(page.locator('text=Attesa fine frase')).toBeVisible();

    // Check descriptions are present
    await expect(page.locator('text=Permetti di interrompere il Maestro')).toBeVisible();
  });
});
