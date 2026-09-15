import type { Locator, Page, Route, TestInfo } from '@playwright/test';
import { stats, results, experiments } from '../../src/app/admin/research/chart-test-fixtures';

export type ChartKind = 'stats' | 'progression' | 'results';

export async function renderedBarPercentages(chart: Locator) {
  return chart.evaluate((element) => {
    const positions = [...element.querySelectorAll('.recharts-cartesian-grid-horizontal line')].map(
      (line) => Number(line.getAttribute('y1')),
    );
    const height = Math.max(...positions) - Math.min(...positions);
    if (!(height > 0)) return [];
    return [...element.querySelectorAll('.recharts-bar-rectangle')].map(
      (bar) => Math.round((bar.getBoundingClientRect().height / height) * 1000) / 10,
    );
  });
}

export async function mockResearchTransport(page: Page) {
  const payloads: Record<string, unknown> = {
    stats,
    'ab-results': results,
    'synthetic-profiles': [{ id: 'profile-one', name: 'Profile One' }],
    experiments: {
      items: [
        ...experiments.map((item) => ({
          ...item,
          status: 'completed',
          completedAt: item.createdAt,
        })),
        {
          ...experiments[0],
          id: 'other-profile',
          maestroId: 'maestro-b',
          profileName: 'Profile Two',
          scores: { scaffolding: 50, hinting: 50, adaptation: 50, misconceptionHandling: 50 },
        },
      ],
      total: 3,
    },
  };
  await page.route('**/api/admin/research/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1);
    if (route.request().method() !== 'GET' || !name || !(name in payloads)) {
      await route.fallback();
      return;
    }
    await route.fulfill({ json: payloads[name] });
  });
}

export async function controlChartChunks(page: Page) {
  const held = new Map<ChartKind, () => void>();
  const released = new Set<ChartKind>();
  const fail = new Set<ChartKind>();
  const events: { kind: ChartKind; path: string; outcome: string }[] = [];
  const signatures: [ChartKind, string][] = [
    ['stats', 'dataKey:"value",fill:"#3b82f6"'],
    ['progression', 'dataKey:"score",stroke:"#2563eb"'],
    ['results', 'dataKey:"avgTutorBenchScore",fill:"#3b82f6"'],
  ];
  const handler = async (route: Route) => {
    const response = await route.fetch();
    const body = await response.text();
    const kind = signatures.find(([, signature]) => body.includes(signature))?.[0];
    if (!kind) {
      await route.fulfill({ response });
      return;
    }
    const event = { kind, path: new URL(route.request().url()).pathname, outcome: 'held' };
    events.push(event);
    if (!released.has(kind)) await new Promise<void>((resolve) => held.set(kind, resolve));
    if (fail.has(kind)) {
      event.outcome = 'aborted';
      await route.abort('failed');
    } else {
      event.outcome = 'delivered-original-bytes';
      await route.fulfill({ response });
    }
  };
  await page.route('**/_next/static/chunks/*.js', handler);
  return {
    events,
    pending: (kind: ChartKind) => held.has(kind),
    release(kind: ChartKind, abort = false) {
      if (abort) fail.add(kind);
      released.add(kind);
      held.get(kind)?.();
      held.delete(kind);
    },
    async dispose() {
      for (const release of held.values()) release();
      held.clear();
      await page.unroute('**/_next/static/chunks/*.js', handler);
    },
  };
}

export function observeBrowser(page: Page) {
  const errors: { source: string; message: string }[] = [];
  page.on('pageerror', (error) => errors.push({ source: 'pageerror', message: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push({ source: 'console', message: message.text() });
  });
  return errors;
}

export async function saveBrowserEvidence(
  page: Page,
  info: TestInfo,
  name: string,
  evidence: object,
) {
  const screenshot = info.outputPath(`${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  await info.attach(name, { path: screenshot, contentType: 'image/png' });
  await info.attach(`${name}-evidence`, {
    body: JSON.stringify(
      {
        authentication: 'real local database session',
        transport: 'mocked research GET only; fixture consent/accessibility',
        ...evidence,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
}
