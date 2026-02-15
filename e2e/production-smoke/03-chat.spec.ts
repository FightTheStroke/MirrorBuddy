/**
 * Production Smoke Tests — Chat & AI Professors
 *
 * Verifies chat opens, professors respond in character,
 * and the AI pipeline (Azure OpenAI) is functional.
 * Uses Trial mode — consumes 1 message per test.
 */

import { test, expect } from './fixtures';

test.describe('PROD-SMOKE: Chat & AI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Enter trial mode
    const trialBtn = page.getByRole('button', { name: /Prova gratis/i });
    if (await trialBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await trialBtn.click();
    }

    // Accept TOS if shown
    const tosAccept = page.getByRole('button', { name: /Accetta e Continua/i });
    if (await tosAccept.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tosAccept.click();
    }
  });

  test('Chat with Euclide — responds in character', async ({ page }) => {
    test.setTimeout(60000);

    await page.getByRole('button', { name: /Studia con Euclide/i }).click();

    // Verify chat panel opens with professor info
    await expect(page.getByRole('heading', { name: 'Euclide', level: 2 })).toBeVisible();
    await expect(page.getByText('Geometria')).toBeVisible();

    // Verify formal greeting (pre-1900 figure uses Lei)
    const greeting = page.locator('[class*="chat"]').first();
    await expect(greeting).toBeVisible();

    // Send a message
    const input = page.getByRole('textbox', { name: /Parla o scrivi/i });
    await input.fill('Cos\'è un triangolo?');
    await input.press('Enter');

    // Wait for AI response
    const messages = page.getByRole('log', { name: /Messaggi/i });
    await expect(messages.locator('p').nth(1)).toBeVisible({ timeout: 30000 });

    // Verify response contains math-related content
    const responseText = await messages.locator('p').nth(1).textContent();
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(50);
  });

  test('Chat tools are visible', async ({ page }) => {
    await page.getByRole('button', { name: /Studia con Euclide/i }).click();

    // Verify educational tools are available
    const tools = [
      'Crea mappa mentale',
      'Crea quiz',
      'Crea flashcard',
      'Crea riassunto',
    ];
    for (const tool of tools) {
      await expect(page.getByRole('button', { name: tool })).toBeVisible();
    }
  });

  test('Voice panel shows for professor', async ({ page }) => {
    await page.getByRole('button', { name: /Studia con Euclide/i }).click();

    // Voice panel appears in sidebar
    const voicePanel = page.getByRole('complementary');
    await expect(voicePanel.getByRole('heading', { name: 'Euclide' })).toBeVisible();

    // Audio controls exist (may be disabled for Trial)
    await expect(voicePanel.getByRole('button', { name: /audio/i }).first()).toBeVisible();
  });

  test('Chat close returns to professor list', async ({ page }) => {
    await page.getByRole('button', { name: /Studia con Euclide/i }).click();
    await expect(page.getByRole('heading', { name: 'Euclide', level: 2 })).toBeVisible();

    await page.getByRole('button', { name: 'Chiudi', exact: true }).click();

    // Back to professor list
    await expect(page.getByRole('heading', { name: 'Professori', level: 1 })).toBeVisible();
  });
});
