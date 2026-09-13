import { test, expect } from './fixtures/consent-fixtures';
import { consent, settings } from './fixtures/consent-journey-helpers';

test('mandatory terms contain focus while nested reading preferences stay reachable at 320px', async ({
  accountPage: page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/it');
  const wall = page.getByTestId('consent-banner');
  await expect(wall).toBeVisible();
  await expect(wall).toHaveAccessibleName(consent.unified.titleWelcome);
  await expect
    .poll(() => wall.evaluate((node) => node.contains(document.activeElement)))
    .toBe(true);
  for (let index = 0; index < 16; index++) {
    await page.keyboard.press(index < 8 ? 'Tab' : 'Shift+Tab');
    expect(await wall.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(wall).toBeVisible();
  await page
    .getByRole('banner', { includeHidden: true })
    .getByRole('button', { name: 'Apri menu', includeHidden: true })
    .evaluate((button) => button.focus());
  expect(await wall.evaluate((node) => node.contains(document.activeElement))).toBe(true);

  const opener = wall.getByRole('button', { name: settings.accessibility.panelTitle });
  await opener.focus();
  await page.keyboard.press('Enter');
  const preferences = page.getByRole('dialog', { name: settings.accessibility.panelTitle });
  await expect(preferences).toBeVisible();
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab');
    expect(await preferences.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  }
  const largeText = preferences.getByRole('checkbox', {
    name: settings.accessibility.testoGrande,
    exact: true,
  });
  await largeText.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('html')).toHaveClass(/large-text/);
  await page.keyboard.press('Escape');
  await expect(preferences).toBeHidden();
  await expect(opener).toBeFocused();

  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const controls = wall.locator('button:not([disabled]), input:not([disabled]), a[href]');
  for (const control of await controls.all()) {
    await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(321);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(721);
  }
  await wall.getByRole('button', { name: consent.unified.buttons.rejectAll }).click();
  await expect(wall).toBeVisible();
  await wall.getByRole('checkbox', { name: consent.unified.tosCheckbox.label }).check();
  await wall.getByRole('button', { name: consent.terms.modal.buttons.accept }).click();
  await expect(wall).toBeHidden();
});
