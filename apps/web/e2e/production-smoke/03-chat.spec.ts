/**
 * Production Smoke Tests — Intent Session UI
 *
 * Opens the current homework → subject → Maestro session without sending a
 * message or consuming AI quota.
 */

import {
  authenticatedTest as test,
  expect,
  hasProdTestAuthCookie,
  openHomeworkSession,
} from './fixtures';

test.describe('PROD-SMOKE: Session UI', () => {
  test.skip(!hasProdTestAuthCookie, 'Production test auth cookie is not available');

  test('Homework flow opens a Maestro session', async ({ page }) => {
    await openHomeworkSession(page);
    await expect(page.getByRole('textbox', { name: /Scrivi un messaggio/i })).toBeVisible();
    await expect(page.getByTestId('maestro-session-handoff')).toContainText(/Matematica/i);
  });

  test('Session tools are visible', async ({ page }) => {
    await openHomeworkSession(page);
    for (const tool of ['Crea mappa mentale', 'Crea quiz', 'Crea flashcard', 'Crea riassunto']) {
      await expect(page.getByRole('button', { name: tool })).toBeVisible();
    }
  });

  test('Voice control is available in the session', async ({ page }) => {
    await openHomeworkSession(page);
    await expect(page.getByRole('button', { name: /Lettura vocale|audio/i }).first()).toBeVisible();
  });

  test('Close returns to the intent chooser', async ({ page }) => {
    await openHomeworkSession(page);
    await page.getByRole('button', { name: 'Chiudi', exact: true }).click();
    await expect(page.locator('#intent-heading')).toBeVisible();
    await expect(page.getByTestId('intent-card-homework')).toBeVisible();
  });
});
