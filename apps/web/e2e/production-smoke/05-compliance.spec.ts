/**
 * Production Smoke Tests — Compliance Pages
 *
 * Verifies all legally required pages are accessible and have
 * expected content structure (EU AI Act, GDPR, COPPA).
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: Compliance Pages', () => {
  const compliancePages = [
    { path: '/it/ai-transparency', heading: /Trasparenza/i, sections: 10 },
    { path: '/it/privacy', heading: /Privacy/i, sections: 5 },
    { path: '/it/terms', heading: /Termini/i, sections: 3 },
    { path: '/it/accessibility', heading: /Accessibilit/i, sections: 3 },
  ];

  for (const { path, heading } of compliancePages) {
    test(`${path} loads with correct heading`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const h1Text = await page.getByRole('heading', { level: 1 }).textContent();
      expect(h1Text).toMatch(heading);
    });
  }

  test('AI Transparency has AI Act references', async ({ page }) => {
    await page.goto('/it/ai-transparency');
    const content = await page.textContent('body');
    expect(content).toContain('EU AI Act');
    expect(content).toContain('GDPR');
    expect(content).toContain('Azure OpenAI');
    expect(content).toContain('132/2025');
  });

  test('Privacy page has GDPR and COPPA sections', async ({ page }) => {
    await page.goto('/it/privacy');
    const content = await page.textContent('body');
    expect(content).toContain('GDPR');
    expect(content).toContain('COPPA');
  });

  test('Compliance pages are available in English', async ({ page }) => {
    await page.goto('/en/ai-transparency');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const content = await page.textContent('body');
    expect(content).toContain('AI Transparency');
  });
});
