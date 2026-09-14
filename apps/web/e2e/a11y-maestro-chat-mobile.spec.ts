/**
 * E2E Regression: Maestro chat on narrow viewports (MB-360 R1 + R3)
 *
 * Before the fix, measured live at 320/375/390 CSS px on `/it/maestri/noether`:
 * - `SharedChatLayout`'s main column resolved flex `min-width: auto` to its
 *   435.81px min-content size inside a 375px `overflow: hidden` parent, putting
 *   the send button at right 427.81px and the close button at right 423.81px —
 *   outside the viewport — while `document.scrollWidth` still read 375px, which
 *   is why a document-level overflow assertion missed the defect.
 * - axe `button-name`: the send control had no accessible name.
 * - axe `color-contrast`: user-bubble timestamp 2.95:1 (`#cbbce7` on `#7e57c2`).
 *
 * These checks measure real rectangles and real rendered colours, including the
 * effective opacity axe uses, so a return of any of the three fails here.
 * No AI provider is called: `/api/chat` is mocked.
 *
 * Colour assertions run only once the bubble fade-in has actually finished — see
 * `waitForSettledMessages`. The first production run of this spec sampled during
 * the animation and read 1.008:1, a probe artefact; the shipped colours measure
 * 5.21:1 (white on #7e57c2) and 4.70:1 (slate-900 at 60% on white).
 *
 * Run: npx playwright test e2e/a11y-maestro-chat-mobile.spec.ts --project=chromium
 */

import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect, toLocalePath } from './fixtures/a11y-fixtures';
import { contrastRatio } from './fixtures/contrast';
import { waitForSettledChrome, waitForSettledMessages } from './fixtures/chat-render-stability';

const NARROW_VIEWPORTS = [
  { name: 'iPhone SE / small Android', width: 320 },
  { name: 'iPhone SE 2022', width: 375 },
  { name: 'iPhone 14 / Pixel', width: 390 },
];

const MIN_NORMAL_TEXT_CONTRAST = 4.5;
/** Minimum size the send and close targets already had; they must not shrink. */
const MIN_TARGET_SIZE = 32;

async function openMaestroChat(page: Page, width: number) {
  await page.setViewportSize({ width, height: 720 });
  await page.route('**/api/chat', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: 'Certo, partiamo dalle equazioni.', usage: {} }),
    }),
  );

  await page.goto(toLocalePath('/maestri/noether'), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('textarea');
  await expect(page.locator('main[role="main"]')).toBeVisible();
  await expect(page.locator('[aria-label="Chiudi"]')).toBeVisible();
  await waitForSettledChrome(page);
}

async function sendMessage(page: Page) {
  const field = page.locator('textarea');
  await field.focus();
  await field.fill('Mi aiuti con le equazioni?');
  await page.keyboard.press('Enter');
  await expect(page.locator('.rounded-br-md').first()).toBeVisible();
  await expect(page.getByText('Certo, partiamo dalle equazioni.')).toBeVisible();
  await waitForSettledMessages(page);
}

/** Rectangles measured with the clipping ancestor unscrolled, as a user first sees it. */
async function measureChrome(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector('main[role="main"]');
    const column = main?.parentElement ?? null;
    const clipper = column?.parentElement ?? null;
    if (clipper) clipper.scrollLeft = 0;

    const rect = (element: Element | null) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width, height: box.height };
    };

    return {
      viewportWidth: document.documentElement.clientWidth,
      send: rect(document.querySelector('button:has(svg.lucide-send)')),
      close: rect(document.querySelector('[aria-label="Chiudi"]')),
      column: rect(column),
      clipperScrollWidth: clipper?.scrollWidth ?? null,
      clipperClientWidth: clipper?.clientWidth ?? null,
    };
  });
}

/** Foreground blended through every ancestor opacity, the way axe evaluates contrast. */
async function renderedTimestampColors(page: Page, bubbleSelector: string) {
  return page.evaluate((selector) => {
    const bubble = document.querySelector(selector);
    const timestamp = Array.from(bubble?.querySelectorAll('span') ?? []).find((span) =>
      /^\d{1,2}:\d{2}$/.test((span.textContent ?? '').trim()),
    );
    if (!timestamp) return null;

    const channels = (color: string) => (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    let effectiveOpacity = 1;
    let ancestorOpacity = 1;
    let node: HTMLElement | null = timestamp;
    while (node && node !== document.body) {
      const opacity = Number(getComputedStyle(node).opacity || '1');
      effectiveOpacity *= opacity;
      if (node !== timestamp) ancestorOpacity *= opacity;
      node = node.parentElement;
    }

    const background = channels(getComputedStyle(bubble as Element).backgroundColor);
    const foreground = channels(getComputedStyle(timestamp).color).map((channel, index) =>
      Math.round(channel * effectiveOpacity + background[index] * (1 - effectiveOpacity)),
    );
    const toRgb = (parts: number[]) => `rgb(${parts.join(', ')})`;

    return {
      foreground: toRgb(foreground),
      background: toRgb(background),
      fontSize: getComputedStyle(timestamp).fontSize,
      effectiveOpacity,
      ancestorOpacity,
    };
  }, bubbleSelector);
}

test.describe('Maestro chat - narrow viewport essential controls', () => {
  for (const viewport of NARROW_VIEWPORTS) {
    test(`send and close stay inside the viewport at ${viewport.width}px (${viewport.name})`, async ({
      page,
    }) => {
      await openMaestroChat(page, viewport.width);
      const chrome = await measureChrome(page);

      expect(chrome.send, 'send button is rendered').not.toBeNull();
      expect(chrome.close, 'close button is rendered').not.toBeNull();

      // The chat column must not exceed its clipping parent: this, not
      // document.scrollWidth, is what pushed the controls off screen.
      expect(chrome.clipperScrollWidth).toBeLessThanOrEqual((chrome.clipperClientWidth ?? 0) + 1);
      expect(chrome.column!.width).toBeLessThanOrEqual(chrome.viewportWidth + 1);

      for (const [label, box] of [
        ['send', chrome.send!],
        ['close', chrome.close!],
      ] as const) {
        expect(box.left, `${label} left edge inside viewport`).toBeGreaterThanOrEqual(-0.5);
        expect(box.right, `${label} right edge inside viewport`).toBeLessThanOrEqual(
          chrome.viewportWidth + 0.5,
        );
        expect(box.width, `${label} target width`).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
        expect(box.height, `${label} target height`).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
      }
    });
  }

  test('controls stay inside the viewport with enlarged text at 375px', async ({ page }) => {
    await openMaestroChat(page, 375);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '20px';
      document.body.style.fontSize = '125%';
    });
    await waitForSettledChrome(page);

    const chrome = await measureChrome(page);

    expect(chrome.clipperScrollWidth).toBeLessThanOrEqual((chrome.clipperClientWidth ?? 0) + 1);
    expect(chrome.send!.right).toBeLessThanOrEqual(chrome.viewportWidth + 0.5);
    expect(chrome.close!.right).toBeLessThanOrEqual(chrome.viewportWidth + 0.5);
    // Enlarged text must grow the targets, never shrink them.
    expect(chrome.send!.height).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
    expect(chrome.close!.height).toBeGreaterThanOrEqual(MIN_TARGET_SIZE);
  });
});

test.describe('Maestro chat - accessible name and rendered contrast', () => {
  test('send action exposes a translated accessible name', async ({ page }) => {
    await openMaestroChat(page, 375);

    await expect(page.getByRole('button', { name: 'Invia messaggio' })).toBeVisible();
  });

  test('user message timestamp meets AA normal-text contrast as rendered', async ({ page }) => {
    await openMaestroChat(page, 375);
    await sendMessage(page);

    const colors = await renderedTimestampColors(page, '.rounded-br-md');

    expect(colors, 'user bubble timestamp is rendered').not.toBeNull();
    // Guards the measurement itself: a fade-in still in flight would silently
    // report a blended colour instead of the shipped one.
    expect(colors!.ancestorOpacity, 'measured after the fade-in settled').toBe(1);
    expect(contrastRatio(colors!.foreground, colors!.background)).toBeGreaterThanOrEqual(
      MIN_NORMAL_TEXT_CONTRAST,
    );
  });

  test('assistant message timestamp meets AA normal-text contrast as rendered', async ({
    page,
  }) => {
    await openMaestroChat(page, 375);
    await sendMessage(page);

    const colors = await renderedTimestampColors(page, '.rounded-bl-md');

    expect(colors, 'assistant bubble timestamp is rendered').not.toBeNull();
    expect(colors!.ancestorOpacity, 'measured after the fade-in settled').toBe(1);
    expect(contrastRatio(colors!.foreground, colors!.background)).toBeGreaterThanOrEqual(
      MIN_NORMAL_TEXT_CONTRAST,
    );
  });

  test('axe reports no contrast or button-name violations in the mobile chat', async ({ page }) => {
    await openMaestroChat(page, 375);
    await sendMessage(page);

    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast', 'button-name'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
