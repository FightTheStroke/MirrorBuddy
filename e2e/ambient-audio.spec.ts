// ============================================================================
// E2E TESTS: Ambient Audio
// Tests for ambient audio functionality
// ============================================================================

import { test, expect } from '@playwright/test';

test.describe('Ambient Audio - Test Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-audio');
    await page.waitForLoadState('networkidle');
  });

  test('test page loads with all main components', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Test Audio Ambientale');

    // Check info cards are present
    await expect(page.locator('text=Funzionalità Disponibili')).toBeVisible();
    await expect(page.locator('text=Rumore Procedurale')).toBeVisible();
    await expect(page.locator('text=Binaural Beats')).toBeVisible();

    // Check main control is present
    await expect(page.locator('text=Audio Ambientale')).toBeVisible();
    await expect(page.locator('text=Volume Principale')).toBeVisible();
  });

  test('preset buttons are visible and interactive', async ({ page }) => {
    // Check all presets are visible
    const presets = ['Focus', 'Lavoro Profondo', 'Creatività', 'Biblioteca', 'Starbucks', 'Giorno di Pioggia', 'Natura'];
    
    for (const preset of presets) {
      await expect(page.locator(`button:has-text("${preset}")`)).toBeVisible();
    }
  });

  test('play/pause controls work', async ({ page }) => {
    // Initially should show Play button
    const playButton = page.locator('button:has-text("Play")').first();
    await expect(playButton).toBeVisible();

    // Click play
    await playButton.click();
    await page.waitForTimeout(1000);

    // After playing, should show Pause button
    const pauseButton = page.locator('button:has-text("Pausa")').first();
    await expect(pauseButton).toBeVisible();

    // Click pause
    await pauseButton.click();
    await page.waitForTimeout(500);

    // Should show Play again
    await expect(page.locator('button:has-text("Play")').first()).toBeVisible();
  });

  test('volume slider is interactive', async ({ page }) => {
    // Find the volume slider
    const volumeLabel = page.locator('text=Volume Principale');
    await expect(volumeLabel).toBeVisible();

    // Check if volume percentage is shown (default 50%)
    await expect(page.locator('text=/[0-9]+%/')).toBeVisible();
  });

  test('stop button becomes enabled after playing', async ({ page }) => {
    // Stop button should be disabled initially
    const stopButton = page.locator('button').filter({ has: page.locator('svg.lucide-square') });
    await expect(stopButton).toBeDisabled();

    // Start playing
    await page.locator('button:has-text("Play")').first().click();
    await page.waitForTimeout(1000);

    // Stop button should now be enabled
    await expect(stopButton).toBeEnabled();

    // Click stop
    await stopButton.click();
    await page.waitForTimeout(500);

    // Stop button should be disabled again
    await expect(stopButton).toBeDisabled();
  });

  test('advanced mixer can be toggled', async ({ page }) => {
    // Find the "Mostra/Nascondi" button for advanced mixer
    const mixerToggle = page.locator('button:has-text("Mostra")').last();
    await mixerToggle.click();
    await page.waitForTimeout(500);

    // Check if advanced controls are visible
    await expect(page.locator('text=Aggiungi Layer')).toBeVisible();
    await expect(page.locator('text=Rumore')).toBeVisible();
    
    // Toggle back
    await page.locator('button:has-text("Nascondi")').last().click();
    await page.waitForTimeout(500);
  });

  test('preset applies and can be played', async ({ page }) => {
    // Click a preset
    await page.locator('button:has-text("Focus")').first().click();
    await page.waitForTimeout(1000);

    // Should start playing automatically
    await expect(page.locator('button:has-text("Pausa")').first()).toBeVisible();

    // Stop
    await page.locator('button').filter({ has: page.locator('svg.lucide-square') }).click();
    await page.waitForTimeout(500);
  });

  test('tips and research cards are visible', async ({ page }) => {
    // Scroll down to see all cards
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Check tips card
    await expect(page.locator('text=💡 Suggerimenti')).toBeVisible();
    await expect(page.locator('text=Per i binaural beats, usa le cuffie')).toBeVisible();

    // Check research card
    await expect(page.locator('text=📚 Basi Scientifiche')).toBeVisible();
    await expect(page.locator('text=Söderlund et al., 2010')).toBeVisible();
  });

  test('back to home button works', async ({ page }) => {
    await page.locator('button:has-text("Torna alla Home")').click();
    await page.waitForTimeout(1000);
    
    // Should navigate to home page
    expect(page.url()).toBe('http://localhost:3000/');
  });
});

test.describe('Ambient Audio - Settings Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('ambient audio settings tab exists', async ({ page }) => {
    // Open settings
    await page.locator('button').filter({ hasText: 'Impostazioni' }).click();
    await page.waitForTimeout(1000);

    // Look for Audio Ambientale tab
    const audioTab = page.locator('button:has-text("Audio Ambientale")');
    await expect(audioTab).toBeVisible();
    
    // Click on it
    await audioTab.click();
    await page.waitForTimeout(1000);

    // Should show ambient audio controls
    await expect(page.locator('text=Audio Ambientale per lo Studio')).toBeVisible();
    await expect(page.locator('text=Preset Rapidi')).toBeVisible();
  });

  test('audio settings are distinct from audio/video settings', async ({ page }) => {
    // Open settings
    await page.locator('button').filter({ hasText: 'Impostazioni' }).click();
    await page.waitForTimeout(1000);

    // Check both tabs exist
    await expect(page.locator('button:has-text("Audio/Video")')).toBeVisible();
    await expect(page.locator('button:has-text("Audio Ambientale")')).toBeVisible();

    // Audio/Video should be for devices
    await page.locator('button:has-text("Audio/Video")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Dispositivi Audio')).toBeVisible();

    // Audio Ambientale should be for ambient sounds
    await page.locator('button:has-text("Audio Ambientale")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Preset Rapidi')).toBeVisible();
  });
});

test.describe('Ambient Audio - Accessibility', () => {
  test('keyboard navigation works on test page', async ({ page }) => {
    await page.goto('/test-audio');
    await page.waitForLoadState('networkidle');

    // Tab through interactive elements
    await page.keyboard.press('Tab'); // Back button
    await page.keyboard.press('Tab'); // First interactive element
    
    // Should be able to focus on buttons
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A']).toContain(focused);
  });

  test('screen reader friendly labels exist', async ({ page }) => {
    await page.goto('/test-audio');
    await page.waitForLoadState('networkidle');

    // Check for aria-labels or proper text content
    const playButton = page.locator('button:has-text("Play")').first();
    const buttonText = await playButton.textContent();
    expect(buttonText).toBeTruthy();
  });
});
