/**
 * E2E: One-handed typing mode
 *
 * A student with hemiplegia or limited hand function must be able to reach the
 * hand-mode control in the typing tool, operate it with the keyboard alone, and
 * see the virtual keyboard restrict itself to the chosen half.
 *
 * Run: npx playwright test e2e/typing-one-handed.spec.ts
 */

import { test, expect, toLocalePath } from './fixtures/a11y-fixtures';

const TYPING_TOOL_LABEL = 'Impara a Digitare';

async function openTypingTool(page: import('@playwright/test').Page) {
  await page.goto(toLocalePath('/astuccio'));
  await page.waitForLoadState('domcontentloaded');
  await page.getByText(TYPING_TOOL_LABEL, { exact: true }).first().click();
  await expect(page.getByRole('group', { name: /Modalit. di scrittura/i })).toBeVisible();
}

test.describe('One-handed typing mode', () => {
  test('the three hand modes are visible in the typing tool', async ({ page }) => {
    await openTypingTool(page);

    const group = page.getByRole('group', { name: /Modalit. di scrittura/i });
    await expect(group.getByRole('button', { name: /Due mani/ })).toBeVisible();
    await expect(group.getByRole('button', { name: /Solo mano sinistra/ })).toBeVisible();
    await expect(group.getByRole('button', { name: /Solo mano destra/ })).toBeVisible();
  });

  test('selecting a hand mode updates the pressed state', async ({ page }) => {
    await openTypingTool(page);

    const group = page.getByRole('group', { name: /Modalit. di scrittura/i });
    const leftOnly = group.getByRole('button', { name: /Solo mano sinistra/ });

    await expect(leftOnly).toHaveAttribute('aria-pressed', 'false');
    await leftOnly.click();
    await expect(leftOnly).toHaveAttribute('aria-pressed', 'true');
    await expect(group.getByRole('button', { name: /Due mani/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('the control is operable with the keyboard alone', async ({ page }) => {
    await openTypingTool(page);

    const group = page.getByRole('group', { name: /Modalit. di scrittura/i });
    const rightOnly = group.getByRole('button', { name: /Solo mano destra/ });

    await rightOnly.focus();
    await expect(rightOnly).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(rightOnly).toHaveAttribute('aria-pressed', 'true');
  });

  test('left-hand mode restricts the virtual keyboard to the left half', async ({ page }) => {
    await openTypingTool(page);

    const group = page.getByRole('group', { name: /Modalit. di scrittura/i });
    await group.getByRole('button', { name: /Solo mano sinistra/ }).click();

    // Enter a lesson so the virtual keyboard renders
    await page
      .getByRole('button', { name: /Home Keys - Sinistra/i })
      .first()
      .click();

    const keyboard = page.getByRole('application', { name: 'Tastiera virtuale' });
    await expect(keyboard).toBeVisible();

    // Left-hand keys stay, right-hand keys are removed
    await expect(keyboard.getByRole('button', { name: 'Tasto a' })).toBeVisible();
    await expect(keyboard.getByRole('button', { name: 'Tasto l' })).toHaveCount(0);
  });
});
