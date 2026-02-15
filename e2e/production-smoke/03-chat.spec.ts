/**
 * Production Smoke Tests — Chat & AI Professors
 *
 * Verifies chat opens, professor info renders, tools are available,
 * and voice panel loads. Does NOT send messages to avoid consuming
 * trial quota. Read-only, no data mutations.
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: Chat & AI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/it');
  });

  test('Chat with Euclide opens with correct info', async ({ page }) => {
    await page.getByRole('button', { name: /Studia con Euclide/i }).click();

    // Verify chat panel opens with professor info
    await expect(page.getByRole('heading', { name: 'Euclide', level: 2 }).first()).toBeVisible();
    await expect(page.getByText('Geometria').first()).toBeVisible();

    // Formal greeting with Lei (pre-1900 figure)
    await expect(page.getByText(/esserLe/i)).toBeVisible();

    // Text input ready
    await expect(page.getByRole('textbox', { name: /Parla o scrivi/i })).toBeVisible();
  });

  test('Chat tools are visible', async ({ page }) => {
    await page.getByRole('button', { name: /Studia con Euclide/i }).click();

    const tools = ['Crea mappa mentale', 'Crea quiz', 'Crea flashcard', 'Crea riassunto'];
    for (const tool of tools) {
      await expect(page.getByRole('button', { name: tool })).toBeVisible();
    }
  });

  test('Voice panel shows for professor', async ({ page }) => {
    await page.getByRole('button', { name: /Studia con Euclide/i }).click();

    const voicePanel = page.getByRole('complementary');
    await expect(voicePanel.getByRole('heading', { name: 'Euclide' })).toBeVisible();

    // Audio controls exist
    await expect(voicePanel.getByRole('button', { name: /audio/i }).first()).toBeVisible();
  });

  test('Chat close returns to professor list', async ({ page }) => {
    await page.getByRole('button', { name: /Studia con Euclide/i }).click();
    await expect(page.getByRole('heading', { name: 'Euclide', level: 2 }).first()).toBeVisible();

    // Close button in chat header
    await page.getByRole('button', { name: 'Chiudi', exact: true }).click();

    // Back to professor list
    await expect(page.getByRole('heading', { name: 'Professori', level: 1 })).toBeVisible();
  });
});
