import path from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect } from '../../../apps/web/e2e/fixtures/base-fixtures';
import { loginAsSofia } from './sofia';
import { Take } from './take';

// Spot3 v2 takes: parents gate + parents view, full accessibility tab (seven long names),
// Visivo profile held long, AI transparency page. Real UI, fictional student, local only.
const OUT = path.join(process.env.DEMO_WORK ?? path.join(__dirname, '..', 'work'), 'takes-spot3');
const ease = (t: number) => t * t * (3 - 2 * t);

async function scroll(t: Take, page: Page, dy: number, seconds: number) {
  const n = Math.round(seconds * 24);
  let done = 0;
  for (let i = 1; i <= n; i++) {
    const target = Math.round(dy * ease(i / n));
    await page.mouse.wheel(0, target - done);
    done = target;
    await t.frame();
  }
}

async function home(page: Page) {
  await page.goto('/it', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-testid="intent-card-homework"]:not([disabled])')).toBeVisible({
    timeout: 60000,
  });
  await page.waitForTimeout(1200);
}

async function passGate(t: Take, page: Page) {
  const q = page.getByText(/Quanto fa \d+ \+ \d+\?/);
  await t.until(async () => q.isVisible(), 5);
  await t.hold(0.9);
  const [, a, b] = (await q.innerText()).match(/(\d+) \+ (\d+)/)!;
  await t.click(page.getByRole('spinbutton'), 0.6, 0.1);
  await t.type(String(Number(a) + Number(b)), 4);
  await t.hold(0.3);
  await t.click(page.getByRole('button', { name: 'Continua' }), 0.5, 0.2);
}

test('spot3 v2 takes', async ({ page }) => {
  await loginAsSofia(page);
  await page.route('**/api/realtime/**', (r) =>
    r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
  );
  await page.clock.install();
  await home(page);

  // 1 — parents: the grown-ups step, then the parents view
  let t = new Take(page, path.join(OUT, 'q_gate'));
  await t.start(700, 500);
  await t.hold(0.5);
  const parents = page
    .getByRole('button', { name: /Area Genitori/ })
    .or(page.getByRole('link', { name: /Area Genitori/ }))
    .first();
  await t.click(parents, 0.9, 0.2);
  await passGate(t, page);
  t.mark('open');
  await t.hold(1.5);
  await t.moveTo({ x: 900, y: 560 }, 0.5);
  await scroll(t, page, 300, 1.5);
  await t.hold(2.0);
  t.finish();
  await page.screenshot({ path: path.join(OUT, 'q_gate_end.png'), fullPage: true });

  // 2 — full accessibility tab in settings (gate already passed this session)
  t = new Take(page, path.join(OUT, 'a_full'));
  await t.adopt();
  await t.click(page.getByTestId('home-nav-settings'), 0.8, 0.2);
  const gate = page.getByText(/Quanto fa \d+ \+ \d+\?/);
  if (await gate.isVisible().catch(() => false)) await passGate(t, page);
  await t.hold(0.8);
  await t.click(
    page.locator('main').getByRole('button', { name: 'Accessibilità', exact: true }),
    0.8,
    0.2,
  );
  await t.hold(1.0);
  const prof = page.locator('main').getByText('Paralisi Cerebrale').first();
  await prof.scrollIntoViewIfNeeded().catch(() => undefined);
  await t.hold(3.0);
  t.finish();
  await page.screenshot({ path: path.join(OUT, 'a_full_end.png'), fullPage: true });

  // 3 — AI transparency page
  await page.clock.resume();
  await page.goto('/it/ai-transparency', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  t = new Take(page, path.join(OUT, 't_transp'));
  await t.start(900, 500);
  await t.hold(1.5);
  await scroll(t, page, 500, 2.5);
  await t.hold(1.5);
  t.finish();

  // 4 — Visivo profile, held long enough to read
  await home(page);
  t = new Take(page, path.join(OUT, 'a_visivo'));
  await t.start(900, 600);
  await t.hold(0.5);
  await t.click(page.getByTestId('a11y-floating-button'), 0.8, 0.2);
  await t.until(async () => page.getByTestId('a11y-quick-panel').isVisible(), 4);
  await t.hold(0.5);
  await t.click(page.getByRole('button', { name: 'Attiva profilo Visivo', exact: true }), 0.6, 0.1);
  t.mark('on');
  await t.hold(0.8);
  await t.click(page.getByTestId('a11y-close-panel-btn'), 0.6, 0.1);
  t.mark('closed');
  await t.hold(3.5);
  t.finish();
});
