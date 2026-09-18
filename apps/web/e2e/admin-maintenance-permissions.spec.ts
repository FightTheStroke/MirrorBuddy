import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures/auth-fixtures';
import { getPrismaClient } from './helpers/prisma-setup';
import { createTestUser, cleanupTestData } from './helpers/test-data';
import { issueTestSession, testSessionCookies } from './helpers/durable-session';
import { CSRF_TOKEN_HEADER } from '../src/lib/auth/cookie-constants';

for (const role of ['ADMIN_READONLY', 'ADMIN'] as const) {
  test(`${role} sees infrastructure with only authorized maintenance controls`, async ({
    adminPage: page,
    baseURL,
  }) => {
    const prisma = getPrismaClient();
    const user = await createTestUser({ username: `e2e-maintenance-${randomUUID()}` });
    await prisma.user.update({ where: { id: user.id }, data: { role } });
    const session = await issueTestSession(prisma, user.id);
    await page.context().addCookies(testSessionCookies(session, baseURL));
    const mutations: string[] = [];
    page.on('request', (request) => {
      if (
        request.url().includes('/api/admin/maintenance') &&
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())
      ) {
        mutations.push(request.method());
      }
    });
    const windows = await page.request.get('/api/admin/maintenance');
    expect(windows.status()).toBe(200);
    await page.goto('/admin/mission-control/infra');
    await expect(page.getByText('Service Health Summary')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const toggle = page.getByRole('button', { name: /^(activate|attiva)/i });
    if (role === 'ADMIN_READONLY') {
      await expect(toggle).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^(cancel|annulla)$/i })).toHaveCount(0);
      const sessionResponse = await page.request.get('/api/session');
      expect(sessionResponse.status()).toBe(200);
      const { csrfToken } = await sessionResponse.json();
      const headers = { [CSRF_TOKEN_HEADER]: csrfToken };
      const toggleDenied = await page.request.post('/api/admin/maintenance/toggle', {
        headers,
        data: { activate: false, windowId: randomUUID() },
      });
      expect(toggleDenied.status()).toBe(403);
      const cancelDenied = await page.request.delete(`/api/admin/maintenance/${randomUUID()}`, {
        headers,
      });
      expect(cancelDenied.status()).toBe(403);
    } else {
      await expect(toggle).toBeEnabled();
      await toggle.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    expect(mutations).toEqual([]);
  });
}

test('fresh readonly browsers keep legitimate consent without maintenance actions', async ({
  browser,
  baseURL,
}) => {
  const prisma = getPrismaClient();
  const user = await createTestUser({ username: `e2e-maintenance-consent-${randomUUID()}` });
  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN_READONLY' } });
  const session = await issueTestSession(prisma, user.id);
  const context = await browser.newContext({
    baseURL,
    storageState: { cookies: testSessionCookies(session, baseURL), origins: [] },
  });
  try {
    const page = await context.newPage();
    await page.goto('/admin/mission-control/infra');
    await expect(page.getByText('Service Health Summary')).toBeVisible();
    await expect(page.getByRole('dialog', { name: /welcome|benvenut/i })).toBeVisible();
    await expect(
      page.getByRole('dialog', { name: /^(attiva|disattiva|activate|deactivate)/i }),
    ).toHaveCount(0);
    await expect(
      page.locator('main button').filter({
        hasText: /^\s*(attiva|disattiva|activate|deactivate|annulla|cancel|conferma|confirm)\b/i,
      }),
    ).toHaveCount(0);
  } finally {
    await context.close();
    await cleanupTestData();
  }
});
