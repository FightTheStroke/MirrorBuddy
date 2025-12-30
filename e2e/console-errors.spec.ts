import { test, expect } from '@playwright/test';

/**
 * Critical test: Check for console errors across all views
 * Zero tolerance for JavaScript errors in production
 */
test.describe('Console Errors Check', () => {
  test('homepage loads without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // Ignore known acceptable errors
        const text = msg.text();
        if (
          !text.includes('favicon') &&
          !text.includes('Failed to load resource') &&
          !text.includes('net::ERR_') &&
          !text.includes('ResizeObserver') // Common React warning
        ) {
          errors.push(text);
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for any async errors

    // Log errors for debugging
    if (errors.length > 0) {
      console.log('Console errors found:', errors);
    }

    expect(errors.length, `Found ${errors.length} console errors: ${errors.join(', ')}`).toBe(0);
  });

  test('quiz view loads without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('net::ERR_') && !text.includes('ResizeObserver')) {
          errors.push(text);
        }
      }
    });

    await page.goto('/');
    await page.click('text=Quiz');
    await page.waitForTimeout(1000);

    expect(errors.length, `Quiz view errors: ${errors.join(', ')}`).toBe(0);
  });

  test('flashcards view loads without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('net::ERR_') && !text.includes('ResizeObserver')) {
          errors.push(text);
        }
      }
    });

    await page.goto('/');
    await page.click('text=Flashcards');
    await page.waitForTimeout(1000);

    expect(errors.length, `Flashcards view errors: ${errors.join(', ')}`).toBe(0);
  });

  test('mindmaps view loads without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('net::ERR_') && !text.includes('ResizeObserver')) {
          errors.push(text);
        }
      }
    });

    await page.goto('/');
    await page.click('text=Mappe Mentali');
    await page.waitForTimeout(1000);

    expect(errors.length, `Mindmaps view errors: ${errors.join(', ')}`).toBe(0);
  });

  test('settings view loads without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('net::ERR_') && !text.includes('ResizeObserver')) {
          errors.push(text);
        }
      }
    });

    await page.goto('/');
    await page.click('text=Impostazioni');
    await page.waitForTimeout(1000);

    expect(errors.length, `Settings view errors: ${errors.join(', ')}`).toBe(0);
  });

  test('progress view loads without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('net::ERR_') && !text.includes('ResizeObserver')) {
          errors.push(text);
        }
      }
    });

    await page.goto('/');
    await page.click('text=Progressi');
    await page.waitForTimeout(1000);

    expect(errors.length, `Progress view errors: ${errors.join(', ')}`).toBe(0);
  });

  test('homework view loads without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('net::ERR_') && !text.includes('ResizeObserver')) {
          errors.push(text);
        }
      }
    });

    await page.goto('/');
    await page.click('text=Materiali');
    await page.waitForTimeout(1000);

    expect(errors.length, `Homework view errors: ${errors.join(', ')}`).toBe(0);
  });

  test('full navigation without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('net::ERR_') && !text.includes('ResizeObserver')) {
          errors.push(text);
        }
      }
    });

    await page.goto('/');
    await page.waitForTimeout(500);

    // Navigate through all views (Compiti renamed to Materiali, Maestri renamed to Professori)
    const views = ['Quiz', 'Flashcards', 'Mappe Mentali', 'Materiali', 'Progressi', 'Impostazioni', 'Professori'];

    for (const view of views) {
      await page.click(`text=${view}`);
      await page.waitForTimeout(500);
    }

    expect(errors.length, `Navigation errors: ${errors.join(', ')}`).toBe(0);
  });
});

test.describe('Uncaught Promise Rejections', () => {
  test('no unhandled promise rejections on homepage', async ({ page }) => {
    const rejections: string[] = [];

    page.on('pageerror', (error) => {
      rejections.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(rejections.length, `Unhandled rejections: ${rejections.join(', ')}`).toBe(0);
  });
});
