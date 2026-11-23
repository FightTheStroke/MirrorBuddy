import path from 'node:path';
import { test, expect } from '../../../apps/web/e2e/fixtures/base-fixtures';
import { loginAsSofia } from './sofia';
import { Take } from './take';

// Spot3 ("Ci sono"): one homework exchange with Euclide on the real chat UI, dyslexia profile
// switched on mid-conversation, then the phone-size home. Maestro replies are served at the
// network layer (scripted, maieutic: they guide, never hand over the answer); the UI is the real one.
const OUT = path.join(process.env.DEMO_WORK ?? path.join(__dirname, '..', 'work'), 'takes-spot3');
const REPLIES = [
  'Tre quarti: quanti ottavi sono? 🤔',
  'E con un ottavo in più?',
  'Esatto. Ci sei arrivata tu. 👏',
];
const Q = ['3/4 + 1/8. Mi dici la risposta?', 'Sei ottavi.', 'Sette ottavi. Ci sono.'];

test('spot3 takes', async ({ page }) => {
  await loginAsSofia(page);
  const gates: Array<() => void> = [];
  const waits = REPLIES.map((_, i) => new Promise<void>((r) => (gates[i] = r)));
  let call = 0;
  await page.route('**/api/chat', async (route) => {
    const i = Math.min(call++, REPLIES.length - 1);
    await waits[i];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: REPLIES[i], usage: {} }),
    });
  });
  await page.route('**/api/realtime/**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"error":"disabled in demo capture"}',
    }),
  );

  await page.goto('/it/maestri/euclide', { waitUntil: 'networkidle' });
  const box = page.locator('textarea');
  await expect(box).toBeVisible({ timeout: 60000 });
  await page.evaluate(() =>
    Promise.all([
      document.fonts.load('16px OpenDyslexic'),
      document.fonts.load('bold 16px OpenDyslexic'),
    ]),
  );
  await page.waitForTimeout(1500);
  await page.clock.install();

  const send = page.getByRole('button', { name: 'Invia messaggio' });
  const t = new Take(page, path.join(OUT, 'c_chat'));
  await t.start(760, 420);
  await t.hold(1.0);
  await t.click(box, 0.8, 0.1);
  t.mark('q1');
  await t.type(Q[0], 2);
  await t.hold(0.3);
  await t.click(send, 0.5, 0.1);
  t.mark('q1sent');
  await t.hold(1.0);
  // dyslexia profile while Euclide is "thinking": the very same conversation re-sets
  await t.click(page.getByTestId('a11y-floating-button'), 0.9, 0.2);
  await t.until(async () => page.getByTestId('a11y-quick-panel').isVisible(), 4);
  await t.hold(0.6);
  await t.click(page.getByRole('button', { name: 'Attiva profilo Dislessia' }), 0.8, 0.1);
  t.mark('dyslexiaOn');
  await t.hold(1.2);
  await t.click(page.getByTestId('a11y-close-panel-btn'), 0.6, 0.1);
  t.mark('panelClosed');
  await t.hold(0.8);
  gates[0]();
  await t.until(async () => page.getByText('quanti ottavi sono').isVisible(), 8);
  t.mark('r1');
  await t.hold(3.0);
  await t.click(box, 0.7, 0.1);
  t.mark('q2');
  await t.type(Q[1], 3);
  await t.click(send, 0.5, 0.1);
  t.mark('q2sent');
  await t.hold(0.6);
  gates[1]();
  await t.until(async () => page.getByText('un ottavo in più').isVisible(), 8);
  t.mark('r2');
  await t.hold(2.6);
  await t.click(box, 0.7, 0.1);
  t.mark('q3');
  await t.type(Q[2], 3);
  await t.click(send, 0.5, 0.1);
  t.mark('q3sent');
  await t.hold(1.0);
  gates[2]();
  await t.until(async () => page.getByText('Ci sei arrivata tu').isVisible(), 8);
  t.mark('r3');
  await t.hold(4.0);
  t.finish();

  // Phone-size home, same account and same profile
  await page.clock.resume();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/it', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-testid="intent-card-homework"]:not([disabled])')).toBeVisible({
    timeout: 60000,
  });
  await page.waitForTimeout(1500);
  const p = new Take(page, path.join(OUT, 'p_phone'));
  await p.start(200, 600);
  await p.hold(1.2);
  await p.moveTo(page.getByTestId('intent-card-homework'), 0.9);
  await p.hold(2.5);
  p.finish();
});
