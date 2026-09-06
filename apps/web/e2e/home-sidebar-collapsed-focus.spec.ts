/**
 * Home sidebar — collapsed navigation keyboard regression (R2)
 *
 * jsdom cannot prove focus traversal or geometry, and that is exactly how this
 * defect survived: at 375px the closed drawer was only translated off-canvas,
 * so Shift+Tab still landed on "Area Genitori" at x = -240, and the collapsed
 * entries were icon-only buttons with no accessible name.
 *
 * Two states, two opposite expectations:
 *  - below `lg`, closed means gone (inert: no focus, no accessibility tree);
 *  - at `lg`, closed means the visible collapsed rail — still operable, still named.
 *
 * Scoping note: the drawer carries its own "Apri menu" toggle while closed, so
 * every opener lookup is scoped to the banner landmark, and the sidebar is
 * addressed by the navigation it contains — never by `.first()`.
 */

import { test, expect, toLocalePath } from './fixtures/a11y-fixtures';
import type { Page, Locator } from '@playwright/test';

const NAV_LABELS = [
  'Casa',
  'I Professori',
  'I miei lavori',
  'I miei premi',
  'Calendario',
  'Impostazioni',
];

const MOBILE = { width: 375, height: 812 };
const DESKTOP = { width: 1280, height: 900 };
const HYDRATION_TIMEOUT = 60000;

/** The home sidebar, identified by the navigation it owns. */
const sidebarOf = (page: Page): Locator =>
  page.locator('aside').filter({ has: page.locator('[data-testid="home-nav-intent"]') });

/** The mobile opener lives in the header, not in the drawer. */
const headerOpener = (page: Page): Locator =>
  page.getByRole('banner').getByRole('button', { name: 'Apri menu' });

// These navigation tests start after consent; consent-child-state.spec.ts
// separately exercises a drawer opened before the real consent read completes.
async function waitForSettledHome(page: Page) {
  await page.waitForFunction(
    () =>
      ['guest', 'account'].includes(sessionStorage.getItem('mirrorbuddy-consent-loaded') ?? '') &&
      document.querySelector('[data-testid="consent-banner"]') === null,
    undefined,
    { timeout: HYDRATION_TIMEOUT },
  );
  await expect(sidebarOf(page)).toBeAttached();
}

async function waitForClosedDrawer(page: Page) {
  await expect(sidebarOf(page)).toHaveClass(/-translate-x-full/, { timeout: HYDRATION_TIMEOUT });
}

async function waitForSidebarMotion(sidebar: Locator) {
  await sidebar.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
}

async function waitForOpenDrawer(page: Page) {
  const sidebar = sidebarOf(page);
  await expect(sidebar).not.toHaveClass(/-translate-x-full/, { timeout: HYDRATION_TIMEOUT });
  await expect(sidebar.getByRole('button', { name: 'Chiudi menu' })).toBeVisible();
  await waitForSidebarMotion(sidebar);
}

/** Where the focus actually is, relative to the sidebar and to the viewport. */
async function focusProbe(page: Page) {
  return page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    const sidebar = document
      .querySelector('[data-testid="home-nav-intent"]')
      ?.closest('aside') as HTMLElement | null;
    if (!active || active === document.body) {
      return { insideSidebar: false, x: 0, label: 'body' };
    }
    const rect = active.getBoundingClientRect();
    return {
      insideSidebar: Boolean(sidebar?.contains(active)),
      x: Math.round(rect.x),
      label: (active.getAttribute('aria-label') || active.textContent || '').trim().slice(0, 40),
    };
  });
}

test.describe('Home sidebar collapsed navigation', () => {
  test('closed mobile drawer takes no focus and exposes no offscreen control', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(toLocalePath('/'));
    await waitForSettledHome(page);
    await expect(headerOpener(page)).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await waitForClosedDrawer(page);

    await expect(sidebarOf(page)).toHaveAttribute('inert', '');

    // Walk the whole keyboard order in both directions. Before the fix this
    // reached "Area Genitori" at x = -240 inside the off-canvas drawer.
    const stops: Array<{ insideSidebar: boolean; x: number; label: string }> = [];
    await page.keyboard.press('Tab');
    for (let step = 0; step < 25; step++) {
      stops.push(await focusProbe(page));
      await page.keyboard.press(step < 12 ? 'Tab' : 'Shift+Tab');
    }

    const entered = stops.filter((s) => s.insideSidebar).map((s) => s.label);
    const offscreen = stops.filter((s) => s.x < 0).map((s) => `${s.label} @x=${s.x}`);
    expect(entered, 'focus entered the closed off-canvas drawer').toEqual([]);
    expect(offscreen, 'focus reached a control outside the viewport').toEqual([]);
  });

  test('opened mobile drawer restores every named entry', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(toLocalePath('/'));
    await waitForSettledHome(page);
    await expect(headerOpener(page)).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await waitForClosedDrawer(page);

    await headerOpener(page).click();
    await waitForOpenDrawer(page);

    const sidebar = sidebarOf(page);
    await expect(sidebar).not.toHaveAttribute('inert', '');
    for (const label of NAV_LABELS) {
      const entry = sidebar.getByRole('button', { name: label, exact: true });
      await expect(entry).toBeVisible();
      await entry.focus();
      await expect(entry).toBeFocused();
      const box = await entry.boundingBox();
      expect(box?.x ?? -1, `${label} is offscreen while the drawer is open`).toBeGreaterThanOrEqual(
        0,
      );
    }
    await expect(sidebar.getByRole('button', { name: 'Area Genitori' })).toBeVisible();
  });

  test('desktop collapsed rail stays named, focusable and never inert', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(toLocalePath('/'));
    await waitForSettledHome(page);

    const sidebar = sidebarOf(page);
    await sidebar.getByRole('button', { name: 'Chiudi menu' }).click();
    await expect(sidebar).toHaveClass(/lg:w-20/, { timeout: HYDRATION_TIMEOUT });
    await expect(sidebar).not.toHaveAttribute('inert', '');
    await waitForSidebarMotion(sidebar);

    for (const label of NAV_LABELS) {
      const entry = sidebar.getByRole('button', { name: label, exact: true });
      await expect(entry).toBeVisible();
      await entry.focus();
      await expect(entry).toBeFocused();
      const box = await entry.boundingBox();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
    }

    // Collapsing the rail must not silently drop the adult entry point either.
    await expect(sidebar.getByRole('button', { name: 'Area Genitori' })).toBeVisible();
  });
});
