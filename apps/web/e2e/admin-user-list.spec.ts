import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures/auth-fixtures';
import { getPrismaClient } from './helpers/prisma-setup';
import { trackTestRecord } from './helpers/test-data-registry';
import { createTestUser } from './helpers/test-data';
import { issueTestSession, testSessionCookies } from './helpers/durable-session';
import type { UserListPage } from '../src/lib/admin/user-list-types';

test.describe('bounded administrative user listing', () => {
  test('real HTTP, server rendering and browser controls share the same filtered users', async ({
    adminPage,
    playwright,
    baseURL,
  }) => {
    const prisma = getPrismaClient();
    const namespace = `e2e-user-list-${randomUUID()}`;
    const createdAt = new Date('2026-01-01T12:00:00.000Z');
    const fixtures = Array.from({ length: 26 }, (_, index) => ({
      id: `${namespace}-${String(index).padStart(2, '0')}`,
      username: `${namespace}-${String(index).padStart(2, '0')}`,
      email: null,
      role: 'USER' as const,
      disabled: index % 2 === 0,
      isTestData: true,
      createdAt,
    }));
    // Register every owned ID before insertion, including a partially failed batch.
    for (const fixture of fixtures) trackTestRecord('userIds', fixture.id);
    try {
      await prisma.user.createMany({ data: fixtures });
      const query = new URLSearchParams({
        search: namespace,
        staging: 'true',
        pageSize: '25',
      });
      const expectedIds = fixtures.map((fixture) => fixture.id).reverse();
      const anonymous = await playwright.request.newContext({
        baseURL,
        storageState: { cookies: [], origins: [] },
      });
      try {
        const denied = await anonymous.get(`/api/admin/users?${query}`);
        expect(denied.status()).toBe(401);
      } finally {
        await anonymous.dispose();
      }

      const api = adminPage.request;
      const first = await api.get(`/api/admin/users?${query}`);
      expect(first.status()).toBe(200);
      const listing: UserListPage = await first.json();
      expect(listing.total).toBe(26);
      expect(listing.totalPages).toBe(2);
      expect(listing.users.map((user) => user.id)).toEqual(expectedIds.slice(0, 25));
      expect(Object.keys(listing.users[0]).sort()).toEqual([
        'createdAt',
        'disabled',
        'email',
        'id',
        'isTestData',
        'role',
        'subscription',
        'username',
      ]);
      const invalid = await api.get(`/api/admin/users?${query}&page=0`);
      expect(invalid.status()).toBe(400);

      const serverPage = await api.get(`/admin/users?${query}&page=2`);
      expect(serverPage.status()).toBe(200);
      const html = await serverPage.text();
      expect(html).toContain(fixtures[0].username);
      expect(html).not.toContain(fixtures[25].username);
      expect(html).not.toContain('passwordHash');
      expect(html).not.toContain('resetToken');

      await adminPage.goto(`/admin/users?${query}`);
      const rows = adminPage.locator('tbody tr');
      await expect(rows).toHaveCount(25);
      await expect(rows.first()).toContainText(fixtures[25].username);
      const pagination = adminPage.locator('nav').filter({ has: adminPage.locator('select') });
      await pagination.getByRole('button').last().click();
      await expect(adminPage).toHaveURL(/page=2(?:&|$)/);
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toContainText(fixtures[0].username);
      await pagination.getByRole('button').first().click();
      await expect(rows).toHaveCount(25);

      const downloadEvent = adminPage.waitForEvent('download');
      await adminPage.getByRole('button', { name: 'JSON', exact: true }).click();
      const download = await downloadEvent;
      const stream = await download.createReadStream();
      if (!stream) throw new Error('Filtered user export did not provide a readable download');
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      const exported: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      expect(exported).toEqual(
        [...fixtures].reverse().map(({ username, email, role, disabled }) => ({
          username,
          email,
          role,
          disabled,
          createdAt: createdAt.toISOString(),
        })),
      );

      const search = adminPage.getByRole('searchbox');
      await search.fill(fixtures[0].username);
      await search.press('Enter');
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toContainText(fixtures[0].username);
      await adminPage.reload();
      await expect(search).toHaveValue(fixtures[0].username);
      await expect(rows).toHaveCount(1);

      await search.fill(namespace);
      await search.press('Enter');
      await expect(rows).toHaveCount(25);
      await adminPage.getByRole('tab').nth(2).click();
      await expect(adminPage).toHaveURL(/tab=disabled(?:&|$)/);
      await expect(rows).toHaveCount(13);
      const hidden = await api.get(`/api/admin/users?search=${namespace}&staging=false`);
      expect(hidden.status()).toBe(200);
      expect((await hidden.json()).total).toBe(0);
    } finally {
      await prisma.user.deleteMany({
        where: { id: { in: fixtures.map((fixture) => fixture.id) } },
      });
      expect(
        await prisma.user.count({ where: { id: { in: fixtures.map((fixture) => fixture.id) } } }),
      ).toBe(0);
    }
  });

  for (const role of ['USER', 'ADMIN_READONLY'] as const) {
    test(`real ${role} sessions cannot read the user listing or gain controls`, async ({
      adminPage,
      playwright,
      baseURL,
    }) => {
      const prisma = getPrismaClient();
      const user = await createTestUser({ username: `e2e-readonly-${randomUUID()}` });
      await prisma.user.update({ where: { id: user.id }, data: { role } });
      const issued = await issueTestSession(prisma, user.id);
      const context = await playwright.request.newContext({
        baseURL,
        storageState: { cookies: testSessionCookies(issued, baseURL), origins: [] },
      });
      const query = new URLSearchParams({ staging: 'true', search: user.username ?? user.id });
      try {
        const denied = await context.get(`/api/admin/users?${query}`);
        expect(denied.status()).toBe(403);
        expect(await denied.text()).not.toContain(user.id);

        await adminPage.context().addCookies(testSessionCookies(issued, baseURL));
        await adminPage.goto(`/admin/users?${query}`);
        await expect(adminPage).toHaveURL(
          (url) => url.pathname === '/login' || /^\/[a-z]{2}\/login$/.test(url.pathname),
        );
        await expect(adminPage.locator('tbody tr')).toHaveCount(0);
        await expect(adminPage.getByRole('button', { name: 'JSON', exact: true })).toHaveCount(0);
      } finally {
        await context.dispose();
      }
    });
  }
});
