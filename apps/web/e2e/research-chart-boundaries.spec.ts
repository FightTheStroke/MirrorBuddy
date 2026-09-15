import { test, expect } from './fixtures/auth-fixtures';
import {
  controlChartChunks,
  mockResearchTransport,
  observeBrowser,
  renderedBarPercentages,
  saveBrowserEvidence,
} from './fixtures/research-chart-browser';

test.use({ locale: 'it-IT' });

test.beforeEach(async ({ adminPage, baseURL }) => {
  if (!baseURL) throw new Error('An explicit local browser target is required');
  const origin = new URL(baseURL).origin;
  await adminPage.context().addCookies([{ name: 'NEXT_LOCALE', value: 'it', url: origin }]);
  await adminPage.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin !== origin) await route.abort('blockedbyclient');
    else await route.fallback();
  });
  await adminPage.unroute('**/api/trial/session');
  const auth = await adminPage.request.get('/api/admin/research/stats');
  expect(auth.status(), 'real admin auth and database-backed route').toBe(200);
  await mockResearchTransport(adminPage);
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`real deferred charts preserve geometry and keyboard at ${viewport.width}px`, async ({
    adminPage: page,
  }, info) => {
    await page.setViewportSize(viewport);
    const errors = observeBrowser(page);
    const chunks = await controlChartChunks(page);
    try {
      await page.goto('/admin/research', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('lang', 'it');
      await expect.poll(() => chunks.pending('stats')).toBe(true);
      expect(chunks.pending('progression')).toBe(false);
      const stats = page.getByLabel('Punteggi per dimensione', { exact: true });
      await expect(stats.locator('[aria-hidden="true"].animate-pulse')).toBeVisible();
      await expect(stats.locator('svg.recharts-surface')).toHaveCount(0);
      const statsBefore = await stats.boundingBox();
      expect(statsBefore?.height).toBe(176);
      expect(statsBefore?.width).toBeGreaterThan(100);
      await saveBrowserEvidence(page, info, 'research-pending', {
        viewport,
        statsBefore,
        chunks: chunks.events,
        errors,
      });
      chunks.release('stats');
      await expect(stats.locator('.recharts-bar-rectangle')).toHaveCount(4);
      await expect.poll(() => renderedBarPercentages(stats)).toEqual([90, 84, 82, 84]);
      expect(await stats.boundingBox()).toEqual(statsBefore);

      const cell = page.getByRole('button', {
        name: 'Open details for maestro-a Profile One',
        exact: true,
      });
      await cell.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Dettaglio Benchmark' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('Improve adaptation', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Profile One', { exact: true })).toBeVisible();
      await expect.poll(() => chunks.pending('progression')).toBe(true);
      const progression = page.getByLabel('Progressione punteggio turno per turno');
      const progressionBefore = await progression.boundingBox();
      expect(progressionBefore?.height).toBe(256);
      await expect(progression.locator('svg.recharts-surface')).toHaveCount(0);
      chunks.release('progression');
      await expect(progression.locator('.recharts-line-curve')).toBeVisible();
      await expect(progression.locator('.recharts-line-dot')).toHaveCount(2);
      await expect
        .poll(() =>
          progression.locator('.recharts-line-curve').evaluate((path) => {
            if (!(path instanceof SVGPathElement) || path.getTotalLength() <= 0) return 0;
            const dash = getComputedStyle(path).strokeDasharray;
            return dash === 'none'
              ? 100
              : Math.round((parseFloat(dash) / path.getTotalLength()) * 1000) / 10;
          }),
        )
        .toBe(100);
      expect(await progression.boundingBox()).toEqual(progressionBefore);
      await saveBrowserEvidence(page, info, 'research-drilldown', {
        viewport,
        statsBefore,
        progressionBefore,
        chunks: chunks.events,
        errors,
      });
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await cell.press('Enter');
      await expect(progression.locator('.recharts-line-curve')).toBeVisible();
      expect(chunks.events.filter((event) => event.kind === 'progression')).toHaveLength(1);
      await page.keyboard.press('Escape');

      await page.goto('/admin/research/ab-testing', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('lang', 'it');
      await expect.poll(() => chunks.pending('results')).toBe(true);
      await expect(page.getByRole('heading', { name: 'Tutor comparison' })).toBeVisible();
      await expect(page.getByRole('cell', { name: '72.5', exact: true })).toBeVisible();
      const management = page.getByRole('link', { name: 'Gestisci Esperimenti A/B', exact: true });
      await expect(management).toHaveAttribute('href', '/admin/research/ab-testing/manage');
      const results = page.getByLabel('Grafico confronto A/B', { exact: true });
      const resultsBefore = await results.boundingBox();
      expect(resultsBefore?.height).toBe(224);
      await expect(results.locator('svg.recharts-surface')).toHaveCount(0);
      chunks.release('results');
      await expect(results.locator('.recharts-bar-rectangle')).toHaveCount(2);
      await expect.poll(() => renderedBarPercentages(results)).toEqual([72.5, 85]);
      expect(await results.boundingBox()).toEqual(resultsBefore);
      await saveBrowserEvidence(page, info, 'ab-results', {
        viewport,
        resultsBefore,
        chunks: chunks.events,
        errors,
      });
      expect(chunks.events.map((event) => event.kind).sort()).toEqual([
        'progression',
        'results',
        'stats',
      ]);
      expect(errors).toEqual([]);
    } finally {
      await chunks.dispose();
    }
  });
}

test('failed real chart chunk surfaces an error and recovers on a real reload', async ({
  adminPage: page,
}, info) => {
  const errors = observeBrowser(page);
  const chunks = await controlChartChunks(page);
  try {
    await page.goto('/admin/research', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');
    await expect.poll(() => chunks.pending('stats')).toBe(true);
    chunks.release('stats', true);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Qualcosa è andato storto', exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => errors.some((error) => /chunk|load|fetch/i.test(error.message)))
      .toBe(true);
    await saveBrowserEvidence(page, info, 'chunk-failure', { chunks: chunks.events, errors });
  } finally {
    await chunks.dispose();
  }
  const errorsBeforeReload = errors.length;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(
    page.getByLabel('Punteggi per dimensione', { exact: true }).locator('.recharts-bar-rectangle'),
  ).toHaveCount(4);
  await expect
    .poll(() => renderedBarPercentages(page.getByLabel('Punteggi per dimensione', { exact: true })))
    .toEqual([90, 84, 82, 84]);
  await saveBrowserEvidence(page, info, 'chunk-recovered', {
    recovery: 'full page reload after restoring original server chunk',
    errors,
  });
  expect(errors.slice(errorsBeforeReload)).toEqual([]);
});
