import { test, expect } from './fixtures/consent-fixtures';
import { acceptRequiredTerms } from './fixtures/consent-journey-helpers';

test('opening the real home drawer before consent GET completes preserves its state and nodes', async ({
  accountPage: page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/it');
  await acceptRequiredTerms(page);
  let release!: () => void;
  let observed!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    observed = resolve;
  });
  await page.route('**/api/user/consent', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    observed();
    await held;
    await route.fulfill({ response });
  });
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await requested;
    const header = page.getByRole('banner');
    const originalHeader = await header.elementHandle();
    expect(originalHeader).not.toBeNull();
    const sidebar = page.locator('aside').filter({ has: page.getByTestId('home-nav-intent') });
    await expect(sidebar).toHaveAttribute('inert', '');
    await header.getByRole('button', { name: 'Apri menu' }).click();
    await expect(sidebar).not.toHaveAttribute('inert');
    await expect(sidebar).not.toHaveClass(/-translate-x-full/);
    release();
    await page.waitForFunction(
      () => sessionStorage.getItem('mirrorbuddy-consent-loaded') === 'account',
    );
    expect(await originalHeader!.evaluate((node) => node.isConnected)).toBe(true);
    expect(await header.evaluate((node, original) => node === original, originalHeader)).toBe(true);
    await expect(sidebar).not.toHaveAttribute('inert');
    await expect(sidebar).not.toHaveClass(/-translate-x-full/);
    await expect(sidebar.getByRole('button', { name: 'Chiudi menu' })).toBeVisible();
  } finally {
    release();
  }
});
