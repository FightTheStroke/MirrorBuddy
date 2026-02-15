/**
 * Production Smoke Tests — Professor Safety & Characters
 *
 * Verifies professor personality, safety guardrails, and character
 * diversity. Checks that coaches and buddies are properly categorized.
 * Read-only, no AI interactions.
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: Professor Safety & Characters', () => {
  test('Maestri API returns all 26 with correct structure', async ({ request }) => {
    const res = await request.get('/api/maestri');
    expect(res.status()).toBe(200);
    const maestri = await res.json();
    expect(maestri).toHaveLength(26);

    // Each maestro should have required fields
    for (const m of maestri) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.subject).toBeTruthy();
      expect(m.role).toBeTruthy();
      // Role should be one of the three types
      expect(['professor', 'coach', 'buddy']).toContain(m.role);
    }
  });

  test('Professor list includes all three character types', async ({ request }) => {
    const res = await request.get('/api/maestri');
    const maestri = await res.json();

    const roles = new Set(maestri.map((m: { role: string }) => m.role));
    expect(roles.has('professor')).toBe(true);
    expect(roles.has('coach')).toBe(true);
    expect(roles.has('buddy')).toBe(true);
  });

  test('Character detail page renders for a professor', async ({ page }) => {
    await page.goto('/it');

    // Click on any available professor
    const professorButton = page.getByRole('button', { name: /Studia con/i }).first();
    await expect(professorButton).toBeVisible({ timeout: 10000 });
    await professorButton.click();

    // Chat interface should appear
    await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 10000 });
  });

  test('AI transparency page is accessible', async ({ page }) => {
    await page.goto('/ai-transparency');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
    const body = await page.textContent('body');
    // Should mention AI, transparency, or similar
    expect(body).toMatch(/trasparenza|intelligenza artificiale|AI|modelli/i);
  });

  test('Safety endpoint rejects unauthenticated', async ({ request }) => {
    const res = await request.get('/api/admin/safety');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
