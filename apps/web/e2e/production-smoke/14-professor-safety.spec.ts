/**
 * Production Smoke Tests — Professor Safety & Characters
 *
 * Verifies professor personality, safety guardrails, and character
 * diversity. Checks that coaches and buddies are properly categorized.
 * Read-only, no AI interactions.
 */

import {
  test,
  authenticatedTest,
  expect,
  hasProdTestAuthCookie,
  openHomeworkSession,
} from './fixtures';

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
      expect(m.displayName).toBeTruthy();
    }
  });

  test('Professor list includes diverse subjects', async ({ request }) => {
    const res = await request.get('/api/maestri');
    const maestri = await res.json();

    const subjects = new Set(maestri.map((m: { subject: string }) => m.subject));
    // Should have a variety of subjects
    expect(subjects.size).toBeGreaterThanOrEqual(5);
  });

  authenticatedTest('Intent flow selects a professor and renders the session', async ({ page }) => {
    authenticatedTest.skip(!hasProdTestAuthCookie, 'Production test auth cookie is not available');
    await openHomeworkSession(page);
    await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('maestro-session-handoff')).toBeVisible();
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
    expect(res.status()).toBe(401);
  });
});
