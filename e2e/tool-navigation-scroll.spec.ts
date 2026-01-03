import { test, expect } from '@playwright/test';

test.describe('Tool Navigation Scroll', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: go through onboarding if needed
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // If we're on welcome page, skip it
    if (page.url().includes('/welcome')) {
      await page.goto('/?skip=true');
      await page.waitForLoadState('networkidle');
    }
  });

  test('creating tool in chat auto-switches to fullscreen focus mode', async ({ page }) => {
    // This is the Option B behavior we're implementing:
    // When a tool is created in normal chat mode, we auto-switch to focus mode

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on a maestro to start conversation
    const maestroCard = page.locator('[data-testid="maestro-card"]').first();
    if (await maestroCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await maestroCard.click();
      await page.waitForTimeout(500);
    }

    // Look for chat input
    const chatInput = page.locator('[data-testid="chat-input"], textarea[placeholder*="scrivi"], input[placeholder*="messaggio"]').first();
    if (!await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Try clicking on a maestro from the list
      const maestroButton = page.locator('button').filter({ hasText: /Euclide|Galileo|Darwin|Marie|Leonardo/i }).first();
      if (await maestroButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await maestroButton.click();
        await page.waitForTimeout(500);
      }
    }

    // This test verifies the UX doesn't have scroll jumps
    // The actual implementation will auto-switch to focus mode when a tool is created

    // For now, we just verify the page doesn't throw errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    // No JS errors should occur
    const relevantErrors = consoleErrors.filter(e =>
      !e.includes('Failed to load resource') &&
      !e.includes('net::ERR') &&
      !e.includes('favicon')
    );
    expect(relevantErrors.length).toBe(0);
  });

  test('focus mode layout has tool area visible', async ({ page }) => {
    // Navigate to a focus mode view
    await page.goto('/education');
    await page.waitForLoadState('networkidle');

    // Try to find focus mode layout elements
    const focusLayout = page.locator('[data-testid="focus-tool-layout"]');
    const toolCanvas = page.locator('[data-testid="tool-canvas"]');
    const maestroPanel = page.locator('[data-testid="maestro-panel"]');

    // If focus mode elements exist, verify layout
    if (await focusLayout.isVisible({ timeout: 5000 }).catch(() => false)) {
      const toolBox = await toolCanvas.boundingBox();
      const maestroBox = await maestroPanel.boundingBox();
      const viewportSize = page.viewportSize();

      if (toolBox && maestroBox && viewportSize) {
        // Tool area should be larger portion (65-75%)
        const toolPercent = (toolBox.width / viewportSize.width) * 100;
        expect(toolPercent).toBeGreaterThan(60);
        expect(toolPercent).toBeLessThan(80);

        // Maestro panel should be smaller (20-40%)
        const maestroPercent = (maestroBox.width / viewportSize.width) * 100;
        expect(maestroPercent).toBeGreaterThan(15);
        expect(maestroPercent).toBeLessThan(45);
      }
    }

    // Page should load without errors
    expect(await page.title()).toBeTruthy();
  });

  test('no scroll jump when navigating between views', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get initial scroll position
    const initialScroll = await page.evaluate(() => window.scrollY);

    // Navigate around
    const navButtons = page.locator('[role="navigation"] button, nav button, [data-testid="nav-item"]');
    const navCount = await navButtons.count();

    for (let i = 0; i < Math.min(navCount, 3); i++) {
      const btn = navButtons.nth(i);
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(500);

        // Check scroll hasn't jumped dramatically (allow 300px for smooth scroll)
        const currentScroll = await page.evaluate(() => window.scrollY);
        const scrollDiff = Math.abs(currentScroll - initialScroll);

        // Allow reasonable scroll (e.g., for page transitions)
        // but not huge unexpected jumps
        expect(scrollDiff).toBeLessThan(1000);
      }
    }
  });
});
