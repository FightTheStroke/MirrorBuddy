import { test as base, expect } from './fixtures/base-fixtures';
import { createE2ETestUser } from './helpers/e2e-user-factory';
import { getPrismaClient } from './helpers/prisma-setup';
import { issueTestSession, testSessionCookies } from './helpers/durable-session';
import { cleanupTestData } from './helpers/test-data';
import { trackTestRecord } from './helpers/test-data-registry';
import { CSRF_TOKEN_HEADER } from '../src/lib/auth/cookie-constants';

const test = base.extend<{ owner: { id: string } }>({
  owner: async ({ context, baseURL }, provideOwner) => {
    const prisma = getPrismaClient();
    const { testUserId } = await createE2ETestUser(prisma);
    trackTestRecord('userIds', testUserId);
    try {
      const session = await issueTestSession(prisma, testUserId);
      await context.clearCookies();
      await context.addCookies(testSessionCookies(session, baseURL));
      await provideOwner({ id: testUserId });
    } finally {
      await cleanupTestData();
      expect(await prisma.user.count({ where: { id: testUserId } })).toBe(0);
      expect(await prisma.progress.count({ where: { userId: testUserId } })).toBe(0);
      expect(await prisma.studySession.count({ where: { userId: testUserId } })).toBe(0);
      expect(await prisma.authSession.count({ where: { userId: testUserId } })).toBe(0);
      process.stdout.write('PROGRESS_SESSION_RECOVERY_CLEANUP_PROVEN\n');
    }
  },
});

test('new and returning students persist progress and sessions across browser reopen', async ({
  page,
  context,
  owner,
}) => {
  const prisma = getPrismaClient();
  expect(await prisma.progress.findUnique({ where: { userId: owner.id } })).toBeNull();
  const initial = await page.request.get('/api/progress');
  expect(initial.status()).toBe(200);
  expect(await initial.json()).toMatchObject({ userId: owner.id, xp: 0 });
  const empty = await page.request.get('/api/progress/sessions?limit=20');
  expect(empty.status()).toBe(200);
  expect(await empty.json()).toEqual([]);

  const csrf = await page.request.get('/api/session');
  expect(csrf.status()).toBe(200);
  const { csrfToken } = await csrf.json();
  expect(typeof csrfToken).toBe('string');
  const headers = { [CSRF_TOKEN_HEADER]: csrfToken };
  const created = await page.request.post('/api/progress/sessions', {
    headers,
    data: { maestroId: 'euclide', subject: 'mathematics' },
  });
  expect(created.status()).toBe(200);
  const session = await created.json();
  expect(session).toMatchObject({ userId: owner.id, maestroId: 'euclide' });
  expect(typeof session.id).toBe('string');
  const ended = await page.request.patch('/api/progress/sessions', {
    headers,
    data: { id: session.id, duration: 12, xpEarned: 47, questions: 3 },
  });
  expect(ended.status()).toBe(200);
  expect(await ended.json()).toMatchObject({ duration: 12, xpEarned: 47, questions: 3 });
  const progress = { mirrorBucks: 47, totalStudyMinutes: 12, questionsAsked: 3 };
  const saved = await page.request.put('/api/progress', { headers, data: progress });
  expect(saved.status()).toBe(200);
  expect(await saved.json()).toMatchObject(progress);
  expect(await prisma.progress.findUnique({ where: { userId: owner.id } })).toMatchObject({
    xp: 47,
    totalStudyMinutes: 12,
    questionsAsked: 3,
  });

  for (let cycle = 0; cycle < 2; cycle++) {
    const reopened = await context.newPage();
    try {
      const reads = [
        reopened.waitForResponse((res) => new URL(res.url()).pathname === '/api/progress'),
        reopened.waitForResponse((res) => new URL(res.url()).pathname === '/api/progress/sessions'),
        reopened.waitForResponse(
          (res) => new URL(res.url()).pathname === '/api/user/accessibility',
        ),
      ];
      await reopened.goto('/it/astuccio');
      const [progressRead, sessionRead, accessibilityRead] = await Promise.all(reads);
      expect(accessibilityRead.status()).toBe(200);
      expect(progressRead.status()).toBe(200);
      expect(await progressRead.json()).toMatchObject(progress);
      expect(sessionRead.status()).toBe(200);
      expect(await sessionRead.json()).toEqual([
        expect.objectContaining({ id: session.id, duration: 12, xpEarned: 47, questions: 3 }),
      ]);
      await expect(reopened.locator('main')).toBeVisible();
    } finally {
      await reopened.close();
    }
  }
  expect(await prisma.studySession.count({ where: { userId: owner.id } })).toBe(1);
});

test('expired credentials cannot read or overwrite persisted progress and sessions', async ({
  page,
  context,
  baseURL,
  owner,
}) => {
  const prisma = getPrismaClient();
  await prisma.progress.create({ data: { userId: owner.id, xp: 73 } });
  const session = await prisma.studySession.create({
    data: { userId: owner.id, maestroId: 'euclide', subject: 'mathematics' },
  });
  const csrf = await page.request.get('/api/session');
  expect(csrf.status()).toBe(200);
  const { csrfToken } = await csrf.json();
  const headers = { [CSRF_TOKEN_HEADER]: csrfToken };
  const expiring = await issueTestSession(prisma, owner.id, 1);
  // Keep sending the expired credential to exercise the server, not cookie eviction.
  await context.addCookies(
    testSessionCookies(expiring, baseURL).map((cookie) => ({
      ...cookie,
      expires: Math.floor(Date.now() / 1000) + 60,
    })),
  );
  await expect
    .poll(async () => {
      const [clock] = await prisma.$queryRaw<Array<{ now: Date }>>`
      SELECT statement_timestamp() AS now
    `;
      return clock.now.getTime();
    })
    .toBeGreaterThan(expiring.expiresAt.getTime());
  for (const path of ['/api/progress', '/api/progress/sessions?limit=20']) {
    const denied = await page.request.get(path);
    expect(denied.status()).toBe(401);
    expect(await denied.json()).toHaveProperty('error');
  }
  expect(
    (
      await page.request.put('/api/progress', {
        headers,
        data: { mirrorBucks: 999 },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await page.request.patch('/api/progress/sessions', {
        headers,
        data: { id: session.id, duration: 999 },
      })
    ).status(),
  ).toBe(401);
  expect(await prisma.progress.findUnique({ where: { userId: owner.id } })).toMatchObject({
    xp: 73,
  });
  expect(await prisma.studySession.findUnique({ where: { id: session.id } })).toMatchObject({
    duration: null,
  });
});
