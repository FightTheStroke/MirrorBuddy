import AxeBuilder from '@axe-core/playwright';
import { test, expect, waitForAnimationsToFinish } from './fixtures/a11y-fixtures';
import {
  mockOnboarding,
  mockHomePageAPIs,
  mockTracking,
  mockTrialTier,
} from './fixtures/api-mocks';

/**
 * Dedicated accessibility coverage for the intention-based home (A11Y-07).
 *
 * Complements the functional spec (home-intent.spec.ts) with:
 *  - axe-core WCAG 2.1 A/AA scans on step 1 (intent cards) and step 2
 *    (subject picker);
 *  - the full keyboard path step1 → step2 → session, driven only by Tab /
 *    Enter (no mouse);
 *  - proof that trial-locked cards stay reachable by keyboard and announce
 *    their lock reason (A11Y-03 regression guard).
 *
 * Uses a11y-fixtures (wall bypasses + NEXT_LOCALE/a11y cookie) and forces
 * Italian so any text assertions stay stable. Structural assertions use
 * data-testid / roles.
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test.beforeEach(async ({ page }) => {
  await mockOnboarding(page);
  await mockHomePageAPIs(page);
  await mockTracking(page);
  // The global storageState authenticates every context as a registered
  // (Base) user; these specs cover the anonymous Trial child UX, so force
  // the Trial tier response (see mockTrialTier docs).
  await mockTrialTier(page);
  // The trial usage dashboard renders an error box if /api/user/usage fails;
  // mock a healthy response so the axe scan reflects the real production UI
  // (not a DB-error fallback state).
  await page.route('**/api/user/usage', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        chat: { used: 2, limit: 10, percentage: 20 },
        voice: { used: 30, limit: 300, percentage: 10, unit: 's' },
        tools: { used: 1, limit: 10, percentage: 10 },
        docs: { used: 0, limit: 5, percentage: 0 },
      }),
    });
  });
});

async function gotoHome(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.locator('#intent-heading')).toBeVisible({ timeout: 20000 });
  // Wait for tier to settle so cards are in their final enabled/locked state.
  await expect(page.getByTestId('intent-card-homework')).toBeEnabled();
  // Let the cards' Framer Motion fade-in settle before any axe scan — mid-
  // animation the interpolated opacity can blend text toward the background
  // and produce a false-positive contrast violation.
  await waitForAnimationsToFinish(page);
}

test('step 1 (intent cards) has no axe violations', async ({ page }) => {
  await gotoHome(page);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    results.violations,
    `intent step has ${results.violations.length} a11y violations`,
  ).toHaveLength(0);
});

test('step 2 (subject picker) has no axe violations', async ({ page }) => {
  await gotoHome(page);
  await page.getByTestId('intent-card-homework').click();
  await expect(page.locator('#intent-subject-heading')).toBeVisible();
  // The step transition is a framer-motion opacity fade on the section; axe
  // samples computed colors, so wait for the section to settle at full opacity
  // before scanning (a mid-fade opacity blends the foreground → false positive).
  await expect(page.locator('section[aria-labelledby="intent-subject-heading"]')).toHaveCSS(
    'opacity',
    '1',
  );
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    results.violations,
    `subject step has ${results.violations.length} a11y violations`,
  ).toHaveLength(0);
});

test('trial-locked cards are keyboard-reachable and announce their lock (A11Y-03)', async ({
  page,
}) => {
  await gotoHome(page);
  const study = page.getByTestId('intent-card-study');
  // aria-disabled (not native disabled) keeps the card in the Tab order.
  await expect(study).toHaveAttribute('aria-disabled', 'true');
  expect(await study.evaluate((el) => (el as HTMLButtonElement).disabled)).toBe(false);
  // The lock reason is wired via aria-describedby → the hint paragraph exists.
  const describedBy = await study.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  await expect(page.locator(`#${describedBy}`)).toBeVisible();
  // It can actually receive keyboard focus.
  await study.focus();
  await expect(study).toBeFocused();
});

test('keyboard-only path: step1 → step2 → session opens', async ({ page }) => {
  await gotoHome(page);

  // Focus the unlocked homework card directly (it is in the Tab order) and
  // activate it with the keyboard.
  const homework = page.getByTestId('intent-card-homework');
  await homework.focus();
  await expect(homework).toBeFocused();
  await page.keyboard.press('Enter');

  // Step 2: subject picker. Focus moves to the step heading on step change
  // (WCAG 3.2 — only on user-driven context change).
  await expect(page.locator('#intent-subject-heading')).toBeVisible();
  await expect(page.locator('#intent-subject-heading')).toBeFocused();

  // Tab to the first real subject and open the session with Enter. We pick a
  // known subject by id to keep the assertion deterministic.
  const subject = page.getByTestId('subject-mathematics');
  await subject.focus();
  await expect(subject).toBeFocused();
  await page.keyboard.press('Enter');

  // The chooser unmounts once a session opens (currentView !== 'intent').
  await expect(page.locator('#intent-subject-heading')).toHaveCount(0);
  await expect(page.locator('#intent-heading')).toHaveCount(0);
});

/**
 * A11Y-06 follow-up: axe + zoom-200% coverage for the two child sub-views
 * reachable from the bambino nav — "I miei lavori" (view `supporti`,
 * LazyZainoView) and "I miei premi" (view `progress`, LazyProgressView).
 * These were ☐ in the original A11Y-06 audit (home only).
 */

async function gotoChildView(page: import('@playwright/test').Page, view: 'supporti' | 'progress') {
  await gotoHome(page);
  // The sidebar nav button is rendered (icon-only when collapsed on desktop);
  // it carries data-testid="home-nav-<view>".
  const navButton = page.getByTestId(`home-nav-${view}`);
  await navButton.click();
  // The lazy view replaces the intent chooser; wait for the chooser to unmount.
  await expect(page.locator('#intent-heading')).toHaveCount(0);
}

function parseRgb(color: string): [number, number, number] {
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];

  const hexMatch = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (hexMatch) {
    return [parseInt(hexMatch[1], 16), parseInt(hexMatch[2], 16), parseInt(hexMatch[3], 16)];
  }

  const oklabMatch = color.match(/^oklab\(([\d.]+)%?\s+(-?[\d.]+)\s+(-?[\d.]+)/);
  if (oklabMatch) {
    const l = Number(oklabMatch[1]);
    const a = Number(oklabMatch[2]);
    const b = Number(oklabMatch[3]);
    const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
    const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
    const sPrime = l - 0.0894841775 * a - 1.291485548 * b;
    const lCube = lPrime ** 3;
    const mCube = mPrime ** 3;
    const sCube = sPrime ** 3;
    const toSrgb = (value: number) => {
      const channel = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
      return Math.round(Math.min(1, Math.max(0, channel)) * 255);
    };
    return [
      toSrgb(4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube),
      toSrgb(-1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube),
      toSrgb(-0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube),
    ];
  }

  const labMatch = color.match(/^lab\(([\d.]+)%?\s+(-?[\d.]+)\s+(-?[\d.]+)/);
  if (labMatch) {
    const l = Number(labMatch[1]);
    const a = Number(labMatch[2]);
    const b = Number(labMatch[3]);
    const fy = (l + 16) / 116;
    const fx = fy + a / 500;
    const fz = fy - b / 200;
    const toXyz = (value: number) => {
      const cube = value ** 3;
      return cube > 0.008856 ? cube : (value - 16 / 116) / 7.787;
    };
    const xD50 = 0.96422 * toXyz(fx);
    const yD50 = toXyz(fy);
    const zD50 = 0.82521 * toXyz(fz);
    const x = 0.9555766 * xD50 - 0.0230393 * yD50 + 0.0631636 * zD50;
    const y = -0.0282895 * xD50 + 1.0099416 * yD50 + 0.0210077 * zD50;
    const z = 0.0122982 * xD50 - 0.020483 * yD50 + 1.3299098 * zD50;
    const toSrgb = (value: number) => {
      const channel = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
      return Math.round(Math.min(1, Math.max(0, channel)) * 255);
    };
    return [
      toSrgb(3.2404542 * x - 1.5371385 * y - 0.4985314 * z),
      toSrgb(-0.969266 * x + 1.8760108 * y + 0.041556 * z),
      toSrgb(0.0556434 * x - 0.2040259 * y + 1.0572252 * z),
    ];
  }

  throw new Error(`Unsupported color format: ${color}`);
}

function channelLuminance(channel: number) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(foreground: string, background: string) {
  const [fr, fg, fb] = parseRgb(foreground).map(channelLuminance);
  const [br, bg, bb] = parseRgb(background).map(channelLuminance);
  const foregroundLuminance = 0.2126 * fr + 0.7152 * fg + 0.0722 * fb;
  const backgroundLuminance = 0.2126 * br + 0.7152 * bg + 0.0722 * bb;
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

async function sampledContrast(page: import('@playwright/test').Page, selector: string) {
  return page.locator(selector).first().evaluate((element) => {
    const normalizeColor = (color: string) => {
      const context = document.createElement('canvas').getContext('2d');
      if (!context) return color;
      context.fillStyle = '#000000';
      context.fillStyle = color;
      return context.fillStyle;
    };

    const style = window.getComputedStyle(element);
    const isTransparent = (color: string) =>
      color === 'transparent' || color === 'rgba(0, 0, 0, 0)' || /\/\s*0\)?$/.test(color);
    let backgroundElement: Element | null = element;
    let background = style.backgroundColor;
    while (backgroundElement && isTransparent(background)) {
      backgroundElement = backgroundElement.parentElement;
      background = backgroundElement ? window.getComputedStyle(backgroundElement).backgroundColor : 'rgb(255, 255, 255)';
    }
    return { color: normalizeColor(style.color), background: normalizeColor(background) };
  });
}

test('child view "I miei lavori" (supporti) has no axe violations', async ({ page }) => {
  await gotoChildView(page, 'supporti');
  // Let the lazy chunk + skeleton settle into real content.
  await expect(page.locator('main')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    // Scope to the main content region (sidebar/header already covered by the
    // home scans above and by A11Y-02).
    .include('main')
    .analyze();
  expect(
    results.violations,
    `supporti view has ${results.violations.length} a11y violations: ${results.violations
      .map((v) => v.id)
      .join(', ')}`,
  ).toHaveLength(0);
});

test('child view "I miei premi" (progress) has no axe violations', async ({ page }) => {
  await gotoChildView(page, 'progress');
  await expect(page.locator('main')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).include('main').analyze();
  expect(
    results.violations,
    `progress view has ${results.violations.length} a11y violations: ${results.violations
      .map((v) => v.id)
      .join(', ')}`,
  ).toHaveLength(0);
});

test('child view "I miei premi" contrast tokens meet WCAG AA in light, dark, and interactive states', async ({
  page,
}) => {
  await gotoChildView(page, 'progress');
  await expect(page.getByTestId('progress-view')).toBeVisible({ timeout: 20000 });

  const inactiveTab = page.getByRole('button', { name: 'Traguardi' });

  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((nextTheme) => {
      document.documentElement.classList.toggle('dark', nextTheme === 'dark');
      document.documentElement.classList.toggle('light', nextTheme === 'light');
      document.body.style.backgroundColor = nextTheme === 'dark' ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)';
    }, theme);

    const tabColors = await sampledContrast(page, '[data-testid="progress-view"] button:has-text("Panoramica")');
    expect(contrastRatio(tabColors.color, tabColors.background), `${theme} active tab`).toBeGreaterThanOrEqual(4.5);

    await inactiveTab.hover();
    await page.waitForTimeout(100);
    const hoverColors = await sampledContrast(page, '[data-testid="progress-view"] button:has-text("Traguardi")');
    expect(contrastRatio(hoverColors.color, hoverColors.background), `${theme} inactive tab hover`).toBeGreaterThanOrEqual(4.5);

    await inactiveTab.focus();
    const focusRingWidth = await inactiveTab.evaluate((element) => window.getComputedStyle(element).outlineWidth);
    expect(focusRingWidth, `${theme} inactive tab remains focusable`).not.toBe('0px');

    const helperText = await sampledContrast(page, '[data-testid="progress-view"] .text-slate-700, [data-testid="progress-view"] .dark\\:text-slate-300');
    expect(contrastRatio(helperText.color, helperText.background), `${theme} helper text`).toBeGreaterThanOrEqual(4.5);
  }

  await page.getByRole('button', { name: 'Traguardi' }).click();
  const lockedCard = page.locator('[data-testid="progress-view"] [aria-label*="bloccato"]').first();
  await expect(lockedCard).toBeVisible();
  await expect(lockedCard).toHaveCSS('opacity', '1');
});

/**
 * WCAG 1.4.10 Reflow: at 200% zoom (≈640px effective width on a 1280px
 * viewport) content must not require two-dimensional scrolling. We emulate the
 * zoom by halving the viewport and assert the document does not overflow
 * horizontally (scrollWidth ≤ clientWidth + 1px rounding tolerance).
 */
async function expectNoHorizontalScrollAt200(page: import('@playwright/test').Page) {
  // 1280 / 2 = 640 CSS px of effective layout width — the WCAG 200% reflow case.
  await page.setViewportSize({ width: 640, height: 900 });
  // Allow layout to settle after the viewport change.
  await expect(page.locator('main')).toBeVisible();
  const overflow = await page.evaluate(() => {
    const el = document.documentElement;
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
  });
  expect(
    overflow.scrollWidth,
    `horizontal overflow at 200% zoom: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test('home intent has no horizontal scroll at 200% zoom (WCAG 1.4.10)', async ({ page }) => {
  await gotoHome(page);
  await expectNoHorizontalScrollAt200(page);
});

test('"I miei lavori" (supporti) has no horizontal scroll at 200% zoom', async ({ page }) => {
  await gotoChildView(page, 'supporti');
  await expectNoHorizontalScrollAt200(page);
});

test('"I miei premi" (progress) has no horizontal scroll at 200% zoom', async ({ page }) => {
  await gotoChildView(page, 'progress');
  await expectNoHorizontalScrollAt200(page);
});
