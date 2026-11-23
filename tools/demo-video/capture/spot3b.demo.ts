import path from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect } from '../../../apps/web/e2e/fixtures/base-fixtures';
import { loginAsSofia } from './sofia';
import { Take } from './take';

// Spot3 extra takes: grown-ups gate + Coach/Buddy page, professors gallery, parents area,
// the seven accessibility profiles. Real UI, fictional student, local only.
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

test('spot3 extra takes', async ({ page }) => {
  await loginAsSofia(page);
  await page.route('**/api/realtime/**', (r) =>
    r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
  );
  await page.clock.install();
  await page.goto('/it', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-testid="intent-card-homework"]:not([disabled])')).toBeVisible({
    timeout: 60000,
  });
  await page.waitForTimeout(1500);

  // 1 — grown-ups gate, then Coach and Buddy
  let t = new Take(page, path.join(OUT, 'k_gate'));
  await t.start(700, 500);
  await t.hold(0.6);
  await t.click(page.getByTestId('home-nav-settings'), 0.9, 0.2);
  const q = page.getByText(/Quanto fa \d+ \+ \d+\?/);
  await t.until(async () => q.isVisible(), 5);
  await t.hold(1.0);
  const [, a, b] = (await q.innerText()).match(/(\d+) \+ (\d+)/)!;
  await t.click(page.getByRole('spinbutton'), 0.7, 0.1);
  await t.type(String(Number(a) + Number(b)), 4);
  await t.hold(0.4);
  await t.click(page.getByRole('button', { name: 'Continua' }), 0.6, 0.2);
  t.mark('open');
  await t.hold(1.0);
  t.finish();

  t = new Take(page, path.join(OUT, 'k_chars'));
  await t.adopt();
  await t.click(
    page.locator('main').getByRole('button', { name: 'Personaggi', exact: true }),
    0.8,
    0.2,
  );
  await t.hold(0.8);
  await t.moveTo(page.getByText('Melissa', { exact: true }).first(), 0.8);
  t.mark('coach');
  await t.hold(1.6);
  await t.moveTo({ x: 1300, y: 600 }, 0.4);
  await scroll(t, page, 760, 1.6);
  await t.moveTo(page.getByText('Mario', { exact: true }).first(), 0.7);
  t.mark('buddy');
  await t.hold(1.8);
  await scroll(t, page, 1400, 1.6);
  t.mark('triangle');
  await t.hold(2.0);
  t.finish();

  // 2 — the professors gallery, top to bottom
  t = new Take(page, path.join(OUT, 'g_prof'));
  await t.adopt();
  await t.click(page.getByTestId('home-nav-maestri'), 0.8, 0.2);
  await t.until(async () => page.getByPlaceholder('Cerca professore o materia...').isVisible(), 5);
  await t.hold(1.2);
  await t.moveTo({ x: 900, y: 520 }, 0.5);
  t.mark('scroll');
  await scroll(t, page, 1500, 6.0);
  await t.hold(1.0);
  t.finish();

  // 3 — parents area
  t = new Take(page, path.join(OUT, 'q_parents'));
  await t.adopt();
  const parents = page
    .getByRole('button', { name: /Area Genitori/ })
    .or(page.getByRole('link', { name: /Area Genitori/ }))
    .first();
  await t.click(parents, 0.9, 0.3);
  await t.hold(3.0);
  t.finish();
  await page.screenshot({ path: path.join(OUT, 'q_parents_end.png'), fullPage: true });

  // 4 — the seven profiles, one tap each, on the home
  await page.clock.resume();
  await page.goto('/it', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-testid="intent-card-homework"]:not([disabled])')).toBeVisible({
    timeout: 60000,
  });
  await page.waitForTimeout(1200);
  t = new Take(page, path.join(OUT, 'a_profiles'));
  await t.start(900, 600);
  await t.hold(0.6);
  await t.click(page.getByTestId('a11y-floating-button'), 0.8, 0.2);
  await t.until(async () => page.getByTestId('a11y-quick-panel').isVisible(), 4);
  await t.hold(0.6);
  for (const name of ['Dislessia', 'ADHD', 'Visivo', 'Motorio', 'Autismo', 'Uditivo', 'Motorio+']) {
    const btn = page
      .getByTestId('a11y-quick-panel')
      .getByRole('button', { name: `Attiva profilo ${name}`, exact: true })
      .first();
    if (!(await btn.isVisible())) {
      console.log('MISSING', name);
      continue;
    }
    await t.click(btn, 0.45, 0.05);
    t.mark(name);
    await t.hold(1.1);
  }
  await t.hold(0.6);
  t.finish();
  const names = await page
    .getByTestId('a11y-quick-panel')
    .getByRole('button')
    .evaluateAll((e) => e.map((x) => x.getAttribute('aria-label') || x.textContent));
  console.log('PROFILEBTNS', JSON.stringify(names));
});
