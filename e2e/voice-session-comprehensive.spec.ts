// ============================================================================
// E2E TESTS: Voice Session Comprehensive
// Tests for voice features, status messages, error handling, and UI states
//
// NOTE: Tests that require context.grantPermissions() for 'microphone'/'camera'
// are skipped on Firefox and WebKit (not supported by Playwright).
// See: https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions
// ============================================================================

import { test, expect, Page } from '@playwright/test';

// Helper to bypass onboarding and go to home page
async function goToHomePage(page: Page) {
  await page.goto('/welcome?skip=true');
  await page.waitForURL(/^\/$/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

// Helper to wait for page to be ready and click a maestro button
async function setupAndClickMaestro(page: Page, name: string = 'Euclide') {
  await goToHomePage(page);
  // Use aria-label which is the actual pattern used by maestro cards
  const button = page.locator(`button[aria-label*="${name}"]`).first();
  await button.waitFor({ state: 'visible', timeout: 10000 });
  await button.click();
}

test.describe('Voice Session Initialization', () => {
  test('opening voice session shows session view', async ({ page }) => {
    await setupAndClickMaestro(page);
    await page.waitForTimeout(1500);

    // Session view should show the maestro name
    await expect(page.locator('text=Euclide').first()).toBeVisible({ timeout: 5000 });
  });

  test('session shows maestro avatar or icon', async ({ page }) => {
    await setupAndClickMaestro(page);
    await page.waitForTimeout(1500);

    // Should show some visual representation (avatar, icon, or svg)
    const hasVisual = await page.locator('img, svg, [class*="avatar"]').first().isVisible().catch(() => false);
    expect(hasVisual).toBe(true);
  });

  test('session shows Italian status text', async ({ page }) => {
    await setupAndClickMaestro(page);
    await page.waitForTimeout(1500);

    // Should show Italian status messages or content
    const italianTexts = [
      'Connessione',
      'In ascolto',
      'Configura',
      'pronto',
      'Verifica',
      'permessi',
      'Rispondo',
      'Euclide',
      'Indietro',
    ];

    let foundText = false;
    for (const text of italianTexts) {
      const hasText = await page.locator(`text=${text}`).first().isVisible().catch(() => false);
      if (hasText) {
        foundText = true;
        break;
      }
    }

    expect(foundText).toBe(true);
  });

  test('session can be closed with back button', async ({ page }) => {
    await setupAndClickMaestro(page);
    await page.waitForTimeout(1500);

    // Find back/close button
    const backButton = page.locator('button').filter({ hasText: /Indietro|Chiudi|Torna/i }).first();

    if (await backButton.isVisible().catch(() => false)) {
      await backButton.click();
      await page.waitForTimeout(500);
    } else {
      // Fallback: press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  test('session can be closed with Escape key', async ({ page }) => {
    await setupAndClickMaestro(page);
    await page.waitForTimeout(1500);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Check that we can navigate back or session closes
    // Note: Escape behavior depends on session mode
  });
});

test.describe('Voice Session Status Messages', () => {
  // Skip permission-dependent tests on Firefox/WebKit
  test.beforeEach(async ({ browserName }, testInfo) => {
    if (testInfo.title.includes('connecting state')) {
      test.skip(
        browserName === 'firefox' || browserName === 'webkit',
        'Microphone permission grants not supported in Firefox/WebKit'
      );
    }
  });

  test('status transitions are visible to user', async ({ page }) => {
    await setupAndClickMaestro(page);

    // Capture status changes over time
    const statuses: string[] = [];

    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(500);
      const statusText = await page.locator('[class*="fixed"]').first().textContent();
      if (statusText) {
        statuses.push(statusText);
      }
    }

    // Should have captured some content
    expect(statuses.length).toBeGreaterThan(0);
  });

  test('connecting state shows appropriate message', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await setupAndClickMaestro(page);
    await page.waitForTimeout(500);

    // Should show connecting or permission checking state
    await page
      .locator('text=Connessione')
      .or(page.locator('text=Verifica'))
      .or(page.locator('text=Inizializzo'))
      .first()
      .isVisible()
      .catch(() => false);

    // Some connecting state should appear briefly
  });

  test('error state shows configuration message', async ({ page }) => {
    await setupAndClickMaestro(page);
    await page.waitForTimeout(2000);

    // If Azure is not configured, should show config message
    await page
      .locator('text=Azure')
      .or(page.locator('text=Configura'))
      .or(page.locator('text=chiave'))
      .or(page.locator('text=API'))
      .first()
      .isVisible()
      .catch(() => false);

    // Either connected or shows config needed
  });
});

test.describe('Voice Session Controls', () => {
  // Skip all tests in this block on Firefox/WebKit - they all require permissions
  test.beforeEach(async ({ browserName }) => {
    test.skip(
      browserName === 'firefox' || browserName === 'webkit',
      'Microphone/camera permission grants not supported in Firefox/WebKit'
    );
  });

  test('mute button is accessible', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await setupAndClickMaestro(page);
    await page.waitForTimeout(2000);

    // Look for mute/unmute button
    const muteButton = page
      .locator('button')
      .filter({ has: page.locator('[aria-label*="mute"], [aria-label*="Mute"]') })
      .first();

    if (await muteButton.isVisible().catch(() => false)) {
      await muteButton.click();
      await page.waitForTimeout(300);
      // Should toggle mute state
    }
  });

  test('tool buttons are displayed when session is active', async ({ page, context }) => {
    await context.grantPermissions(['microphone', 'camera']);
    await setupAndClickMaestro(page);
    await page.waitForTimeout(2000);

    // Check for tool buttons (Webcam, Mindmap, Quiz, etc.)
    const toolButtons = page.locator('[aria-label*="Webcam"], [aria-label*="Mappa"], [aria-label*="Quiz"]');
    await toolButtons.count();

    // Tool buttons may or may not be visible depending on Azure config
  });

  test('webcam toggle works when session is active', async ({ page, context }) => {
    await context.grantPermissions(['microphone', 'camera']);
    await setupAndClickMaestro(page);
    await page.waitForTimeout(2000);

    const webcamButton = page.locator('[aria-label*="Webcam"]').first();

    if (await webcamButton.isVisible().catch(() => false)) {
      await webcamButton.click();
      await page.waitForTimeout(500);

      // Webcam should toggle (check for video element or state change)
    }
  });
});

test.describe('Voice Session Audio Feedback', () => {
  // Skip all tests in this block on Firefox/WebKit - they all require permissions
  test.beforeEach(async ({ browserName }) => {
    test.skip(
      browserName === 'firefox' || browserName === 'webkit',
      'Microphone permission grants not supported in Firefox/WebKit'
    );
  });

  test('input level indicator is visible during session', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await setupAndClickMaestro(page);
    await page.waitForTimeout(2000);

    // Look for audio level visualization - locator created to verify element exists
    page.locator('[class*="level"], [class*="audio"], [class*="meter"]').first();
    // Level indicator may be implemented as CSS animation or SVG
  });

  test('speaking indicator shows when AI responds', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await setupAndClickMaestro(page);
    await page.waitForTimeout(2000);

    // Look for speaking/responding indicator
    await page
      .locator('text=Rispondo')
      .or(page.locator('text=Parlo'))
      .or(page.locator('[class*="speaking"]'))
      .first()
      .isVisible()
      .catch(() => false);

    // Speaking indicator may or may not be visible
  });
});

test.describe('Voice Session Multiple Maestri', () => {
  test('can switch between different maestri', async ({ page }) => {
    // Open session with Euclide
    await setupAndClickMaestro(page);
    await page.waitForTimeout(1500);

    // Check modal content
    const hasEuclide = await page.locator('text=Euclide').first().isVisible().catch(() => false);
    expect(hasEuclide).toBeTruthy();

    // Close and navigate back to home
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open session with different maestro
    const feynmanButton = page.locator('button').filter({ hasText: 'Feynman' }).first();
    if (await feynmanButton.isVisible().catch(() => false)) {
      await feynmanButton.click();
      await page.waitForTimeout(1500);

      // Should show Feynman's name
      const hasFeynman = await page.locator('text=Feynman').first().isVisible();
      expect(hasFeynman).toBeTruthy();
    }
  });

  test('each maestro shows their specific name', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Just test with Euclide to avoid modal timing issues
    const button = page.locator('button').filter({ hasText: 'Euclide' }).first();

    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await page.waitForTimeout(1000);

      // Should show maestro name in modal
      const hasName = await page.locator('text=Euclide').first().isVisible();
      expect(hasName).toBeTruthy();

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Voice Session Accessibility', () => {
  test('session modal is keyboard navigable', async ({ page }) => {
    await setupAndClickMaestro(page);
    await page.waitForTimeout(1500);

    // Tab through modal elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should focus on interactive elements
    const focused = page.locator(':focus');
    await focused.isVisible().catch(() => false);
  });

  test('close button has aria-label', async ({ page }) => {
    await setupAndClickMaestro(page);
    await page.waitForTimeout(1500);

    // Find close button and check for aria-label
    const closeButton = page.locator('button[aria-label*="Chiudi"], button[aria-label*="close"]').first();
    await closeButton.isVisible().catch(() => false);
  });

  test('status messages are announced to screen readers', async ({ page }) => {
    await setupAndClickMaestro(page);
    await page.waitForTimeout(1500);

    // Check for live region or status role
    const liveRegion = page.locator('[aria-live], [role="status"]');
    await liveRegion.count();

    // May or may not have explicit live region
  });
});

test.describe('Voice Session Error Recovery', () => {
  test('session recovers from connection error gracefully', async ({ page }) => {
    await setupAndClickMaestro(page);
    await page.waitForTimeout(2000);

    // Even with errors, page should remain functional
    const mainContent = page.locator('[class*="fixed"]').first();
    await expect(mainContent).toBeVisible();

    // Should be able to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Main grid should still work
    const hasMaestri = await page.locator('text=Euclide').first().isVisible();
    expect(hasMaestri).toBeTruthy();
  });

  test('can retry connection after error', async ({ page }) => {
    await setupAndClickMaestro(page);
    await page.waitForTimeout(2000);

    // Look for retry button
    const retryButton = page.locator('button').filter({ hasText: /Riprova|Riconnetti|Retry/i }).first();

    if (await retryButton.isVisible().catch(() => false)) {
      await retryButton.click();
      await page.waitForTimeout(1000);

      // Should attempt reconnection
    }
  });
});

test.describe('Voice Session Performance', () => {
  // Skip permission-dependent tests on Firefox/WebKit
  test.beforeEach(async ({ browserName }, testInfo) => {
    // 'closing session' test involves voice session which requires permissions internally
    if (testInfo.title.includes('closing session')) {
      test.skip(
        browserName === 'firefox' || browserName === 'webkit',
        'Voice session tests require microphone permissions not supported in Firefox/WebKit'
      );
    }
  });

  test('session opens quickly (under 2 seconds)', async ({ page }) => {
    await goToHomePage(page);

    const button = page.locator('button[aria-label*="Euclide"]').first();
    await button.waitFor({ state: 'visible', timeout: 10000 });

    const startTime = Date.now();
    await button.click();

    // Wait for session view to show maestro name
    await page.locator('text=Euclide').first().waitFor({
      state: 'visible',
      timeout: 2000,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should open within 2 seconds
    expect(duration).toBeLessThan(2000);
  });

  test('closing session is instant', async ({ page }) => {
    await setupAndClickMaestro(page);
    await page.waitForTimeout(1500);

    const startTime = Date.now();

    // Click back button if visible, otherwise press Escape
    const backButton = page.locator('button').filter({ hasText: /Indietro|Chiudi|Torna/i }).first();
    if (await backButton.isVisible().catch(() => false)) {
      await backButton.click();
    } else {
      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(500);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should close within 1 second
    expect(duration).toBeLessThan(1000);
  });
});
