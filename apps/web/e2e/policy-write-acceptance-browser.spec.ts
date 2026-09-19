import { test, expect, type PolicyAcceptance } from './fixtures/policy-acceptance-fixtures';
import type { Browser } from '@playwright/test';
import messages from '../messages/it/admin.json';

const text = messages.admin.policyWrite;
test.beforeEach(({}, info) => {
  test.skip(!info.project.metadata.policyAcceptance, 'Requires dedicated local acceptance harness');
});

async function openPanel(browser: Browser, policy: PolicyAcceptance, id: string) {
  const context = await browser.newContext({ locale: 'it-IT' });
  await context.addCookies([
    ...policy.cookies,
    { name: 'NEXT_LOCALE', value: 'it', url: policy.options.origin },
  ]);
  const page = await context.newPage();
  await page.goto(`${policy.options.origin}/admin`);
  const row = page.getByText(id, { exact: true }).locator('xpath=../../..');
  await expect(row).toBeVisible();
  return { context, page, row };
}

test('C8 long DB-defined labels keep the real pointer control inside its dashboard panel', async ({
  browser,
  policy: p,
}) => {
  const name = `Owned acceptance ${'W'.repeat(80)}`;
  const id = await p.flag(name);
  const { context, page, row } = await openPanel(browser, p, name);
  try {
    const button = row.getByRole('button', { name: text.disable, exact: true });
    await button.scrollIntoViewIfNeeded();
    const geometry = await button.evaluate((element) => {
      const panel = element.closest('.border-slate-200');
      if (!panel) throw new Error('Dashboard panel not found');
      return {
        button: element.getBoundingClientRect().toJSON(),
        panel: panel.getBoundingClientRect().toJSON(),
      };
    });
    p.record('C8-layout', geometry);
    expect(geometry.button.right).toBeLessThanOrEqual(geometry.panel.right);
    expect(geometry.button.left).toBeGreaterThanOrEqual(geometry.panel.left);
    const [response] = await Promise.all([
      page.waitForResponse(
        (result) =>
          result.url().endsWith('/api/admin/feature-flags') && result.request().method() === 'POST',
        { timeout: 10000 },
      ),
      button.click({ timeout: 5000 }),
    ]);
    expect(response.status()).toBe(200);
    expect((await p.prisma.featureFlag.findUniqueOrThrow({ where: { id } })).killSwitch).toBe(true);
  } finally {
    await context.close();
  }
});

test('C8 browser keyboard stop preserves localized 503 and protection through real polling', async ({
  browser,
  policy: p,
}) => {
  const id = await p.flag();
  const { context, page, row } = await openPanel(browser, p, id);
  try {
    await p.control('/arm', { mode: 'outage', target: id });
    const failed = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/admin/feature-flags') &&
        response.request().method() === 'POST',
    );
    await row.getByRole('button', { name: text.disable, exact: true }).focus();
    await page.keyboard.press('Enter');
    expect((await failed).status()).toBe(503);
    await expect(page.getByRole('alert').filter({ hasText: text.unconfirmed })).toBeVisible();
    await expect(row.getByRole('button', { name: text.enable, exact: true })).toBeEnabled();
    await expect(page.getByRole('status').filter({ hasText: text.instanceNotice })).toBeVisible();
    const poll = await page.waitForResponse(
      (response) => response.url().includes('/api/admin/feature-flags?health=true'),
      { timeout: 35000 },
    );
    expect(poll.status()).toBe(200);
    await expect(page.getByRole('alert').filter({ hasText: text.unconfirmed })).toBeVisible();
    await expect(row.getByRole('button', { name: text.enable, exact: true })).toBeEnabled();
    await row.screenshot({ path: `${p.options.directory}/browser-503-owned-row.png` });
    await p.control('/release');
    const retry = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/admin/feature-flags') &&
        response.request().method() === 'POST',
    );
    await row.getByRole('button', { name: text.enable, exact: true }).focus();
    await page.keyboard.press('Enter');
    expect((await retry).status()).toBe(200);
    await expect(row.getByRole('button', { name: text.disable, exact: true })).toBeEnabled();
    await expect(page.getByRole('alert').filter({ hasText: text.unconfirmed })).toHaveCount(0);
    expect((await p.prisma.featureFlag.findUniqueOrThrow({ where: { id } })).killSwitch).toBe(
      false,
    );
    p.record('C8-503', { keyboard: 'focus+Enter', locale: 'it', realPoll: 200, retry: 200 });
  } finally {
    await context.close();
  }
});

test('C8 browser superseded release retains localized 409 through polling and explicit retry', async ({
  browser,
  policy: p,
}) => {
  const id = await p.flag();
  expect((await p.mutation({ featureId: id, enabled: true })).status).toBe(200);
  const { context, page, row } = await openPanel(browser, p, id);
  try {
    await p.control('/arm', { mode: 'hold-ack', target: id });
    const failed = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/admin/feature-flags') &&
        response.request().method() === 'POST',
    );
    await row.getByRole('button', { name: text.enable, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await p.control('/stats')).held).toBe(1);
    const newer = p.mutation({ featureId: id, enabled: true, reason: 'new browser stop' });
    await expect
      .poll(async () => (await p.effective(id)).killSwitchReason)
      .toBe('new browser stop');
    await p.control('/release');
    expect((await failed).status()).toBe(409);
    expect((await newer).status).toBe(200);
    await expect(page.getByRole('alert').filter({ hasText: text.superseded })).toBeVisible();
    const poll = await page.waitForResponse(
      (response) => response.url().includes('/api/admin/feature-flags?health=true'),
      { timeout: 35000 },
    );
    expect(poll.status()).toBe(200);
    await expect(page.getByRole('alert').filter({ hasText: text.superseded })).toBeVisible();
    await expect(row.getByRole('button', { name: text.enable, exact: true })).toBeEnabled();
    await row.screenshot({ path: `${p.options.directory}/browser-409-owned-row.png` });
    const [retry] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/admin/feature-flags') &&
          response.request().method() === 'POST',
        { timeout: 10000 },
      ),
      row.getByRole('button', { name: text.enable, exact: true }).click({ timeout: 5000 }),
    ]);
    expect(retry.status()).toBe(200);
    await expect(row.getByRole('button', { name: text.disable, exact: true })).toBeEnabled();
    await expect(page.getByRole('alert').filter({ hasText: text.superseded })).toHaveCount(0);
    p.record('C8-409', { keyboard: 'focus+Enter', locale: 'it', realPoll: 200, retry: 200 });
  } finally {
    await context.close();
  }
});
