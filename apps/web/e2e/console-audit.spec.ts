/**
 * Browser console audit.
 *
 * Why this exists: on 28 August 2026 a student hit three separate errors on
 * screen — a rejected realtime session, a missing translation and repeated
 * 403s — while all 113 E2E specs stayed green. None of them read the browser
 * console. This one does, on every page a child can reach.
 *
 * A failure here means the browser itself reported a problem. Do not silence
 * it by widening the ignore list unless the message is provably harmless.
 */

import { test, expect } from './fixtures/auth-fixtures';
import {
  CONSOLE_AUDIT_ROUTES,
  isIgnoredConsoleMessage,
  isIgnoredRequest,
} from './console-audit-routes';
import type { Page } from '@playwright/test';

interface PageProblem {
  kind: 'console' | 'pageerror' | 'request';
  detail: string;
}

function watchForProblems(page: Page): PageProblem[] {
  const problems: PageProblem[] = [];

  page.on('console', async (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (isIgnoredConsoleMessage(text)) return;
    const args = await Promise.all(
      message.args().map((arg) => arg.jsonValue().catch(() => undefined)),
    );
    const context = args.filter((arg) => arg && typeof arg === 'object');
    const detail = context.length ? `${text} :: ${JSON.stringify(context)}` : text;
    problems.push({ kind: 'console', detail });
  });

  page.on('pageerror', (error) => {
    if (isIgnoredConsoleMessage(error.message)) return;
    problems.push({ kind: 'pageerror', detail: error.message });
  });

  page.on('response', (response) => {
    const status = response.status();
    if (status < 400) return;
    const url = response.url();
    if (isIgnoredRequest(url)) return;
    problems.push({ kind: 'request', detail: `${status} ${url}` });
  });

  return problems;
}

function describe(problems: PageProblem[]): string {
  return problems.map((p) => `  [${p.kind}] ${p.detail}`).join('\n');
}

test.describe('Browser console audit', () => {
  for (const route of CONSOLE_AUDIT_ROUTES) {
    test(`no browser errors on ${route}`, async ({ trialPage }) => {
      const problems = watchForProblems(trialPage);

      await trialPage.goto(`/it${route === '/' ? '' : route}`, {
        waitUntil: 'domcontentloaded',
      });
      await trialPage.waitForTimeout(2500);

      expect(problems, `${route} produced browser errors:\n${describe(problems)}`).toEqual([]);
    });
  }
});
