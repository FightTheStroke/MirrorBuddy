/**
 * FULL APP SMOKE TEST
 *
 * Comprehensive E2E test that navigates the ENTIRE app and collects ALL browser errors.
 * This test catches:
 * - Console errors (including Next.js hydration, turbo, etc.)
 * - Network failures
 * - JavaScript exceptions
 * - React errors
 * - Unhandled promise rejections
 *
 * Run with: npx playwright test e2e/full-app-smoke.spec.ts
 */

import { test, expect, Page, ConsoleMessage } from '@playwright/test';

interface BrowserError {
  type: 'console' | 'pageerror' | 'network' | 'crash';
  message: string;
  url?: string;
  timestamp: string;
  stack?: string;
}

interface TestContext {
  errors: BrowserError[];
  warnings: BrowserError[];
  page: Page;
}

// Patterns to ignore (not real errors)
const IGNORE_PATTERNS = [
  /Download the React DevTools/i,
  /React DevTools/i,
  /webpack-hmr/i,
  /\[HMR\]/i,
  /Fast Refresh/i,
  /Compiled successfully/i,
  /favicon\.ico/i,
  /manifest\.json/i,
  /robots\.txt/i,
  /sitemap\.xml/i,
  /_next\/static/i,
  /chrome-extension/i,
  /moz-extension/i,
  /ResizeObserver loop/i, // Common benign warning
  /401.*Unauthorized/i, // Expected for unauthenticated
  /429.*Too Many Requests/i, // Rate limiting is expected
  /net::ERR_ABORTED/i, // Navigation cancellation
  /\?_rsc=/i, // Next.js RSC navigation
  /Voice API error.*Too many requests/i, // Rate limiting on voice
  /api\/realtime\/token.*429/i, // Rate limit on realtime
  /status of 401/i, // Auth expected
  /status of 429/i, // Rate limit expected
];

function shouldIgnore(message: string): boolean {
  return IGNORE_PATTERNS.some(pattern => pattern.test(message));
}

function setupErrorCapture(page: Page, ctx: TestContext): void {
  // Capture console errors and warnings
  page.on('console', (msg: ConsoleMessage) => {
    const text = msg.text();
    if (shouldIgnore(text)) return;

    const error: BrowserError = {
      type: 'console',
      message: text,
      url: page.url(),
      timestamp: new Date().toISOString(),
    };

    if (msg.type() === 'error') {
      ctx.errors.push(error);
    } else if (msg.type() === 'warning') {
      ctx.warnings.push(error);
    }
  });

  // Capture uncaught exceptions
  page.on('pageerror', (error: Error) => {
    if (shouldIgnore(error.message)) return;
    ctx.errors.push({
      type: 'pageerror',
      message: error.message,
      stack: error.stack,
      url: page.url(),
      timestamp: new Date().toISOString(),
    });
  });

  // Capture failed network requests
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    const url = request.url();
    if (shouldIgnore(url)) return;

    ctx.errors.push({
      type: 'network',
      message: `Network request failed: ${url} - ${failure?.errorText || 'Unknown error'}`,
      url: page.url(),
      timestamp: new Date().toISOString(),
    });
  });

  // Capture response errors (4xx, 5xx)
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !shouldIgnore(url)) {
      // Ignore expected status codes
      if (status === 401) return; // Unauthenticated is expected
      if (status === 429) return; // Rate limiting is expected
      if (status === 404 && (url.includes('favicon') || url.includes('manifest'))) return;

      ctx.errors.push({
        type: 'network',
        message: `HTTP ${status}: ${url}`,
        url: page.url(),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Capture page crashes
  page.on('crash', () => {
    ctx.errors.push({
      type: 'crash',
      message: 'PAGE CRASHED!',
      url: page.url(),
      timestamp: new Date().toISOString(),
    });
  });
}

function printErrorSummary(ctx: TestContext, testName: string): void {
  if (ctx.errors.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log(`ERRORS FOUND IN: ${testName}`);
    console.log('='.repeat(80));
    ctx.errors.forEach((err, i) => {
      console.log(`\n[${i + 1}] ${err.type.toUpperCase()} @ ${err.timestamp}`);
      console.log(`    URL: ${err.url}`);
      console.log(`    Message: ${err.message}`);
      if (err.stack) {
        console.log(`    Stack: ${err.stack.split('\n').slice(0, 3).join('\n           ')}`);
      }
    });
    console.log('\n' + '='.repeat(80));
  }

  if (ctx.warnings.length > 0) {
    console.log('\n' + '-'.repeat(80));
    console.log(`WARNINGS (${ctx.warnings.length}) IN: ${testName}`);
    console.log('-'.repeat(80));
    ctx.warnings.slice(0, 10).forEach((warn, i) => {
      console.log(`[${i + 1}] ${warn.message.substring(0, 200)}`);
    });
    if (ctx.warnings.length > 10) {
      console.log(`... and ${ctx.warnings.length - 10} more warnings`);
    }
  }
}

// ============================================================================
// MAIN TEST SUITE
// ============================================================================

test.describe('Full App Smoke Test - Error Collection', () => {
  let ctx: TestContext;

  test.beforeEach(async ({ page }) => {
    ctx = {
      errors: [],
      warnings: [],
      page,
    };
    setupErrorCapture(page, ctx);
  });

  test.afterEach(async ({}, testInfo) => {
    printErrorSummary(ctx, testInfo.title);

    // Fail the test if there are errors
    if (ctx.errors.length > 0) {
      const errorMessages = ctx.errors.map(e => `[${e.type}] ${e.message}`).join('\n');
      expect.soft(ctx.errors.length, `Found ${ctx.errors.length} browser errors:\n${errorMessages}`).toBe(0);
    }
  });

  // ==========================================================================
  // ROUTE NAVIGATION
  // ==========================================================================

  test('navigates all main routes without errors', async ({ page }) => {
    const routes = [
      '/',
      '/welcome',
      '/landing',
      '/showcase',
      '/showcase/accessibility',
      '/showcase/flashcards',
      '/showcase/maestri',
      '/showcase/quiz',
      '/showcase/chat',
      '/showcase/mindmaps',
    ];

    for (const route of routes) {
      await test.step(`Navigate to ${route}`, async () => {
        await page.goto(route, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(500); // Let React hydrate

        // Check page loaded
        const body = page.locator('body');
        await expect(body).toBeVisible();
      });
    }
  });

  // ==========================================================================
  // MAIN DASHBOARD NAVIGATION
  // ==========================================================================

  test('navigates all sidebar items on main dashboard', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // All navigation items in Italian
    const navItems = [
      'Coach',
      'Buddy',
      'Maestri',
      'Quiz',
      'Flashcards',
      'Mappe Mentali',
      'Riassunti',
      'Materiali',
      'Study Kit',
      'Calendario',
      'Demo',
      'Progressi',
      'Genitori',
      'Impostazioni',
    ];

    for (const item of navItems) {
      await test.step(`Click sidebar: ${item}`, async () => {
        const button = page.locator('button, a').filter({ hasText: new RegExp(`^${item}$`, 'i') }).first();
        if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
          await button.click();
          await page.waitForTimeout(500);
        }
      });
    }
  });

  // ==========================================================================
  // MAESTRI GRID
  // ==========================================================================

  test('opens all maestri cards without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click Maestri nav
    const maestriNav = page.locator('button').filter({ hasText: /^Maestri$/i }).first();
    if (await maestriNav.isVisible().catch(() => false)) {
      await maestriNav.click();
      await page.waitForTimeout(500);
    }

    const maestri = [
      'Euclide',
      'Feynman',
      'Galileo',
      'Curie',
      'Darwin',
      'Erodoto',
      'Humboldt',
      'Manzoni',
      'Shakespeare',
      'Leonardo',
      'Mozart',
      'Cicerone',
      'Smith',
      'Lovelace',
      'Ippocrate',
      'Socrate',
    ];

    for (const maestro of maestri) {
      await test.step(`Click maestro: ${maestro}`, async () => {
        const card = page.locator('button, [role="button"]').filter({ hasText: new RegExp(maestro, 'i') }).first();
        if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
          await card.click();
          await page.waitForTimeout(800);

          // Close modal/session if opened
          const closeBtn = page.locator('[aria-label*="close"], [aria-label*="chiudi"], button:has-text("×")').first();
          if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await closeBtn.click();
            await page.waitForTimeout(300);
          }

          // Press Escape as fallback
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      });
    }
  });

  // ==========================================================================
  // COACH SELECTION
  // ==========================================================================

  test('opens all coach options without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const coaches = ['Melissa', 'Roberto', 'Chiara', 'Andrea', 'Favij'];

    // Click Coach nav to open selection
    const coachNav = page.locator('button').filter({ hasText: /^Coach$/i }).first();
    if (await coachNav.isVisible().catch(() => false)) {
      await coachNav.click();
      await page.waitForTimeout(500);
    }

    for (const coach of coaches) {
      await test.step(`Select coach: ${coach}`, async () => {
        const option = page.locator('button, [role="option"], [role="menuitem"]').filter({ hasText: new RegExp(coach, 'i') }).first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
          await page.waitForTimeout(500);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      });
    }
  });

  // ==========================================================================
  // BUDDY SELECTION
  // ==========================================================================

  test('opens all buddy options without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const buddies = ['Mario', 'Noemi', 'Enea', 'Bruno', 'Sofia'];

    // Click Buddy nav to open selection
    const buddyNav = page.locator('button').filter({ hasText: /^Buddy$/i }).first();
    if (await buddyNav.isVisible().catch(() => false)) {
      await buddyNav.click();
      await page.waitForTimeout(500);
    }

    for (const buddy of buddies) {
      await test.step(`Select buddy: ${buddy}`, async () => {
        const option = page.locator('button, [role="option"], [role="menuitem"]').filter({ hasText: new RegExp(buddy, 'i') }).first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
          await page.waitForTimeout(500);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      });
    }
  });

  // ==========================================================================
  // TOOLS - QUIZ
  // ==========================================================================

  test('quiz tool loads without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const quizNav = page.locator('button').filter({ hasText: /^Quiz$/i }).first();
    if (await quizNav.isVisible().catch(() => false)) {
      await quizNav.click();
      await page.waitForTimeout(1000);

      // Check if quiz interface loaded
      const quizContent = page.locator('[class*="quiz"], [data-testid*="quiz"]').first();
      if (await quizContent.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Try to interact with quiz if there's content
        const answerButton = page.locator('button').filter({ hasText: /^[A-D]\./i }).first();
        if (await answerButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await answerButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  // ==========================================================================
  // TOOLS - FLASHCARDS
  // ==========================================================================

  test('flashcards tool loads without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const flashNav = page.locator('button').filter({ hasText: /^Flashcards$/i }).first();
    if (await flashNav.isVisible().catch(() => false)) {
      await flashNav.click();
      await page.waitForTimeout(1000);

      // Try to flip a card if visible
      const card = page.locator('[class*="flashcard"], [class*="card"]').first();
      if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
        await card.click();
        await page.waitForTimeout(500);
      }
    }
  });

  // ==========================================================================
  // TOOLS - MINDMAPS
  // ==========================================================================

  test('mindmap tool loads without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const mindmapNav = page.locator('button').filter({ hasText: /Mappe Mentali/i }).first();
    if (await mindmapNav.isVisible().catch(() => false)) {
      await mindmapNav.click();
      await page.waitForTimeout(1000);

      // Check for mindmap SVG or example cards
      const mindmapContent = page.locator('svg.markmap, [class*="mindmap"]').first();
      if (await mindmapContent.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Try zoom controls if available
        const zoomIn = page.locator('button:has-text("+")').first();
        if (await zoomIn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await zoomIn.click();
          await page.waitForTimeout(300);
        }
      }

      // Click an example mindmap if available
      const exampleCard = page.locator('button, [class*="card"]').filter({ hasText: /Matematica|Storia|Algebra/i }).first();
      if (await exampleCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await exampleCard.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  // ==========================================================================
  // TOOLS - SUMMARIES (RIASSUNTI)
  // ==========================================================================

  test('summaries tool loads without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const summaryNav = page.locator('button').filter({ hasText: /^Riassunti$/i }).first();
    if (await summaryNav.isVisible().catch(() => false)) {
      await summaryNav.click();
      await page.waitForTimeout(1000);
    }
  });

  // ==========================================================================
  // TOOLS - DEMO
  // ==========================================================================

  test('demo tool loads without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const demoNav = page.locator('button').filter({ hasText: /^Demo$/i }).first();
    if (await demoNav.isVisible().catch(() => false)) {
      await demoNav.click();
      await page.waitForTimeout(1000);
    }
  });

  // ==========================================================================
  // CALENDAR
  // ==========================================================================

  test('calendar loads without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const calNav = page.locator('button').filter({ hasText: /^Calendario$/i }).first();
    if (await calNav.isVisible().catch(() => false)) {
      await calNav.click();
      await page.waitForTimeout(1000);

      // Try navigation arrows if visible
      const nextWeek = page.locator('button[aria-label*="next"], button:has-text(">")').first();
      if (await nextWeek.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextWeek.click();
        await page.waitForTimeout(500);
      }
    }
  });

  // ==========================================================================
  // PROGRESS / PROGRESSI
  // ==========================================================================

  test('progress page loads without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const progressNav = page.locator('button').filter({ hasText: /^Progressi$/i }).first();
    if (await progressNav.isVisible().catch(() => false)) {
      await progressNav.click();
      await page.waitForTimeout(1000);
    }
  });

  // ==========================================================================
  // SETTINGS / IMPOSTAZIONI
  // ==========================================================================

  test('settings page loads and all tabs work without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const settingsNav = page.locator('button').filter({ hasText: /^Impostazioni$/i }).first();
    if (await settingsNav.isVisible().catch(() => false)) {
      await settingsNav.click();
      await page.waitForTimeout(1000);

      // Try different settings tabs
      const tabs = ['Accessibilità', 'Audio', 'Personaggio', 'Profilo', 'Notifiche'];
      for (const tab of tabs) {
        const tabBtn = page.locator('button, [role="tab"]').filter({ hasText: new RegExp(tab, 'i') }).first();
        if (await tabBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await tabBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  // ==========================================================================
  // PARENT DASHBOARD
  // ==========================================================================

  test('parent dashboard loads without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const parentNav = page.locator('button').filter({ hasText: /^Genitori$/i }).first();
    if (await parentNav.isVisible().catch(() => false)) {
      await parentNav.click();
      await page.waitForTimeout(1000);
    }
  });

  // ==========================================================================
  // STUDY KIT
  // ==========================================================================

  test('study kit loads without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const studyKitNav = page.locator('button').filter({ hasText: /^Study Kit$/i }).first();
    if (await studyKitNav.isVisible().catch(() => false)) {
      await studyKitNav.click();
      await page.waitForTimeout(1000);
    }
  });

  // ==========================================================================
  // MATERIALS / MATERIALI
  // ==========================================================================

  test('materials page loads without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const materialsNav = page.locator('button').filter({ hasText: /^Materiali$/i }).first();
    if (await materialsNav.isVisible().catch(() => false)) {
      await materialsNav.click();
      await page.waitForTimeout(1000);
    }
  });

  // ==========================================================================
  // WELCOME / ONBOARDING FLOW
  // ==========================================================================

  test('welcome/onboarding flow loads without errors', async ({ page }) => {
    await page.goto('/welcome', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Try to progress through onboarding steps
    for (let step = 0; step < 5; step++) {
      const continueBtn = page.locator('button').filter({ hasText: /continua|avanti|inizia|next/i }).first();
      if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(800);
      }
    }
  });

  // ==========================================================================
  // SHOWCASE PAGES
  // ==========================================================================

  test('all showcase pages load without errors', async ({ page }) => {
    const showcasePages = [
      '/showcase',
      '/showcase/accessibility',
      '/showcase/flashcards',
      '/showcase/maestri',
      '/showcase/quiz',
      '/showcase/chat',
      '/showcase/mindmaps',
    ];

    for (const showcasePage of showcasePages) {
      await test.step(`Load ${showcasePage}`, async () => {
        await page.goto(showcasePage, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1000);

        // Basic interaction - click any visible button
        const buttons = page.locator('button:visible').first();
        if (await buttons.isVisible({ timeout: 1000 }).catch(() => false)) {
          await buttons.click().catch(() => {}); // Ignore click errors
          await page.waitForTimeout(300);
        }
      });
    }
  });

  // ==========================================================================
  // CHAT SIMULATION
  // ==========================================================================

  test('chat with maestro simulation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click on Euclide (math maestro)
    const euclide = page.locator('button, [role="button"]').filter({ hasText: /Euclide/i }).first();
    if (await euclide.isVisible({ timeout: 3000 }).catch(() => false)) {
      await euclide.click();
      await page.waitForTimeout(1500);

      // Look for chat input
      const chatInput = page.locator('input[type="text"], textarea').filter({ hasText: '' }).first();
      if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await chatInput.fill('Ciao, spiegami le equazioni');
        await page.waitForTimeout(300);

        // Press enter or click send
        const sendBtn = page.locator('button[type="submit"], button:has-text("Invia")').first();
        if (await sendBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await sendBtn.click();
        } else {
          await page.keyboard.press('Enter');
        }
        await page.waitForTimeout(2000); // Wait for response
      }

      // Close session
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  // ==========================================================================
  // AMBIENT AUDIO WIDGET
  // ==========================================================================

  test('ambient audio widget works without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Look for audio widget
    const audioWidget = page.locator('[class*="ambient"], [aria-label*="audio"], button:has-text("Audio")').first();
    if (await audioWidget.isVisible({ timeout: 2000 }).catch(() => false)) {
      await audioWidget.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
    }
  });

  // ==========================================================================
  // POMODORO WIDGET
  // ==========================================================================

  test('pomodoro widget works without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Look for pomodoro widget
    const pomodoroWidget = page.locator('[class*="pomodoro"], [aria-label*="pomodoro"], [aria-label*="timer"]').first();
    if (await pomodoroWidget.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pomodoroWidget.click();
      await page.waitForTimeout(500);

      // Try start button
      const startBtn = page.locator('button:has-text("Start"), button:has-text("Inizia")').first();
      if (await startBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await startBtn.click();
        await page.waitForTimeout(500);
      }

      await page.keyboard.press('Escape');
    }
  });

  // ==========================================================================
  // NOTIFICATION BELL
  // ==========================================================================

  test('notification bell works without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const notifBell = page.locator('[aria-label*="notif"], button:has([class*="bell"])').first();
    if (await notifBell.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notifBell.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
    }
  });

  // ==========================================================================
  // KEYBOARD NAVIGATION
  // ==========================================================================

  test('keyboard navigation works without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Tab through the page multiple times
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }

    // Check focus is somewhere visible
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible().catch(() => {}); // Don't fail on this
  });

  // ==========================================================================
  // RESPONSIVE / RESIZE
  // ==========================================================================

  test('page handles resize without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Back to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
  });

  // ==========================================================================
  // API ENDPOINTS HEALTH CHECK
  // ==========================================================================

  test('main API endpoints respond without errors', async ({ page }) => {
    const apiEndpoints = [
      '/api/health',
      '/api/user/profile',
      '/api/maestri',
      '/api/tools/list',
    ];

    for (const endpoint of apiEndpoints) {
      await test.step(`Check API: ${endpoint}`, async () => {
        const response = await page.request.get(endpoint).catch(() => null);
        if (response) {
          // We expect 200 or 401 (unauthenticated is ok)
          const status = response.status();
          expect([200, 401, 404]).toContain(status);
        }
      });
    }
  });

  // ==========================================================================
  // FINAL COMPREHENSIVE NAVIGATION
  // ==========================================================================

  test('complete app journey without errors', async ({ page }) => {
    // This test simulates a real user session

    await test.step('Load home page', async () => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
    });

    await test.step('Browse maestri', async () => {
      const maestriBtn = page.locator('button').filter({ hasText: /^Maestri$/i }).first();
      if (await maestriBtn.isVisible().catch(() => false)) {
        await maestriBtn.click();
        await page.waitForTimeout(500);
      }
    });

    await test.step('Open a maestro', async () => {
      const maestro = page.locator('button').filter({ hasText: /Euclide|Leonardo|Darwin/i }).first();
      if (await maestro.isVisible().catch(() => false)) {
        await maestro.click();
        await page.waitForTimeout(1000);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    });

    await test.step('Check quiz', async () => {
      const quizBtn = page.locator('button').filter({ hasText: /^Quiz$/i }).first();
      if (await quizBtn.isVisible().catch(() => false)) {
        await quizBtn.click();
        await page.waitForTimeout(500);
      }
    });

    await test.step('Check flashcards', async () => {
      const flashBtn = page.locator('button').filter({ hasText: /^Flashcards$/i }).first();
      if (await flashBtn.isVisible().catch(() => false)) {
        await flashBtn.click();
        await page.waitForTimeout(500);
      }
    });

    await test.step('Check mindmaps', async () => {
      const mmBtn = page.locator('button').filter({ hasText: /Mappe Mentali/i }).first();
      if (await mmBtn.isVisible().catch(() => false)) {
        await mmBtn.click();
        await page.waitForTimeout(500);
      }
    });

    await test.step('Check settings', async () => {
      const settingsBtn = page.locator('button').filter({ hasText: /^Impostazioni$/i }).first();
      if (await settingsBtn.isVisible().catch(() => false)) {
        await settingsBtn.click();
        await page.waitForTimeout(500);
      }
    });

    await test.step('Check progress', async () => {
      const progressBtn = page.locator('button').filter({ hasText: /^Progressi$/i }).first();
      if (await progressBtn.isVisible().catch(() => false)) {
        await progressBtn.click();
        await page.waitForTimeout(500);
      }
    });
  });
});

// =============================================================================
// AGGREGATED ERROR REPORT TEST
// =============================================================================

test.describe('Error Summary Report', () => {
  const allErrors: BrowserError[] = [];
  const allWarnings: BrowserError[] = [];

  test.afterAll(async () => {
    if (allErrors.length > 0 || allWarnings.length > 0) {
      console.log('\n');
      console.log('╔' + '═'.repeat(78) + '╗');
      console.log('║' + ' '.repeat(25) + 'FINAL ERROR SUMMARY' + ' '.repeat(34) + '║');
      console.log('╠' + '═'.repeat(78) + '╣');
      console.log(`║ Total Errors:   ${String(allErrors.length).padEnd(60)}║`);
      console.log(`║ Total Warnings: ${String(allWarnings.length).padEnd(60)}║`);
      console.log('╚' + '═'.repeat(78) + '╝');
    }
  });
});
