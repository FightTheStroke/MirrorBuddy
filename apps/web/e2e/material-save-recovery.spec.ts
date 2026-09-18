import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures/user-fixtures';
import { getPrismaClient } from './helpers/prisma-setup';
import { waitForSettledChrome, waitForSettledMessages } from './fixtures/chat-render-stability';
import { createE2ETestUser } from './helpers/e2e-user-factory';
import { issueTestSession, testSessionCookies } from './helpers/durable-session';
import { trackTestRecord } from './helpers/test-data-registry';

const owners: string[] = [];
const content = {
  questions: [
    {
      text: 'What is one half of four?',
      options: ['Two', 'Three'],
      correctAnswer: 0,
    },
  ],
};

test.afterAll(async () => {
  const prisma = getPrismaClient();
  expect(await prisma.user.count({ where: { id: { in: owners } } })).toBe(0);
  expect(await prisma.material.count({ where: { userId: { in: owners } } })).toBe(0);
  console.log('MATERIAL_RECOVERY_CLEANUP_PROVEN');
});

test('material input errors are controlled and cannot create partial records', async ({
  request,
}) => {
  const session = await request.get('/api/session');
  expect(session.ok()).toBe(true);
  const { csrfToken } = await session.json();
  const user = await request.get('/api/user');
  expect(user.ok()).toBe(true);
  const { id } = await user.json();
  owners.push(id);
  const valid = { toolId: randomUUID(), toolType: 'quiz', title: 'Fractions', content };
  const invalidBodies = [
    'null',
    '[]',
    '{',
    JSON.stringify({ ...valid, title: undefined }),
    JSON.stringify({ ...valid, title: '' }),
    JSON.stringify({ ...valid, title: ' \t\n ' }),
    JSON.stringify({ ...valid, content: null }),
    JSON.stringify({ ...valid, content: undefined }),
    JSON.stringify({ ...valid, content: [] }),
  ];
  for (const data of invalidBodies) {
    const response = await request.post('/api/materials', {
      data,
      headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
    });
    expect.soft(response.status(), `invalid input: ${data}`).toBe(400);
    expect.soft(await response.json()).toHaveProperty('error');
  }
  expect(await getPrismaClient().material.count({ where: { userId: id } })).toBe(0);
});

test('a repeated valid save keeps one complete record belonging to the session owner', async ({
  request,
}) => {
  const session = await request.get('/api/session');
  expect(session.ok()).toBe(true);
  const { csrfToken } = await session.json();
  const user = await request.get('/api/user');
  expect(user.ok()).toBe(true);
  const { id } = await user.json();
  owners.push(id);
  const toolId = randomUUID();
  const data = { toolId, toolType: 'quiz', title: '  Fractions: revision  ', content };
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await request.post('/api/materials', {
      data,
      headers: { 'x-csrf-token': csrfToken },
    });
    expect(response.ok()).toBe(true);
    expect(await response.json()).toMatchObject({ success: true, material: data });
  }
  const stored = await getPrismaClient().material.findMany({ where: { userId: id, toolId } });
  expect(stored).toHaveLength(1);
  expect(stored[0].title).toBe(data.title);
  expect(JSON.parse(stored[0].content)).toEqual(content);
});

test('a save prepared before a session switch cannot persist under the new owner', async ({
  request,
  playwright,
  baseURL,
  extraHTTPHeaders,
}) => {
  const user = await request.get('/api/user');
  expect(user.ok()).toBe(true);
  const { id: previousOwner } = await user.json();
  owners.push(previousOwner);
  const data = {
    userId: previousOwner,
    toolId: randomUUID(),
    toolType: 'quiz',
    title: 'Private pending quiz',
    content,
  };
  const prisma = getPrismaClient();
  const { testUserId: nextOwner } = await createE2ETestUser(prisma);
  trackTestRecord('userIds', nextOwner);
  owners.push(nextOwner);
  const issued = await issueTestSession(prisma, nextOwner);
  const nextSession = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders,
    storageState: { cookies: testSessionCookies(issued, baseURL), origins: [] },
  });
  try {
    const session = await nextSession.get('/api/session');
    expect(session.ok()).toBe(true);
    const { csrfToken } = await session.json();
    const headers = { 'x-csrf-token': csrfToken };
    const rejected = await nextSession.post('/api/materials', { data, headers });
    expect(rejected.status()).toBe(403);
    expect(await rejected.json()).toEqual({ error: 'Material identity changed' });
    expect(await prisma.material.count({ where: { toolId: data.toolId } })).toBe(0);

    const accepted = await nextSession.post('/api/materials', {
      data: { ...data, userId: nextOwner },
      headers,
    });
    expect(accepted.ok()).toBe(true);
    const stored = await prisma.material.findMany({ where: { toolId: data.toolId } });
    expect(stored).toHaveLength(1);
    expect(stored[0].userId).toBe(nextOwner);
  } finally {
    await nextSession.dispose();
  }
});

for (const scenario of ['network retry', 'navigation while pending']) {
  test(`browser material survives ${scenario} and a full reload`, async ({
    page,
    context,
    request,
  }) => {
    test.setTimeout(90_000);
    const user = await request.get('/api/user');
    expect(user.ok()).toBe(true);
    const { id } = await user.json();
    owners.push(id);
    await context.addCookies((await request.storageState()).cookies);
    const toolId = randomUUID();
    const title = `Fractions recovery ${toolId}`;
    const releaseSave = Promise.withResolvers<void>();
    let attempts = 0;

    // Only the AI boundary is substituted; identity, CSRF, persistence and reads are real.
    await page.route('**/api/realtime/ephemeral-token', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Voice is outside this text-only persistence test' }),
      }),
    );
    await page.route('**/api/chat', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: 'Here is your quiz.',
          toolCalls: [
            {
              id: toolId,
              name: 'create_quiz',
              type: 'quiz',
              status: 'completed',
              arguments: {},
              result: {
                success: true,
                data: { topic: title, subject: 'mathematics', ...content },
              },
            },
          ],
        }),
      }),
    );
    await page.route('**/api/materials', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      attempts++;
      if (attempts === 1 && scenario === 'network retry') return route.abort('failed');
      if (attempts === 1) await releaseSave.promise;
      return route.continue();
    });

    try {
      await page.goto('/it/maestri/noether', { waitUntil: 'domcontentloaded' });
      await waitForSettledChrome(page);
      await waitForSettledMessages(page);
      await page.locator('textarea').fill('Prepare a fractions quiz');
      const chatResponse = page.waitForResponse((response) => response.url().endsWith('/api/chat'));
      await page.locator('textarea').press('Enter');
      expect((await chatResponse).ok()).toBe(true);
      await expect(page.getByText(content.questions[0].text, { exact: true })).toBeVisible();
      await expect.poll(() => attempts).toBe(1);

      if (scenario === 'network retry') {
        await expect(page.getByText('Salvataggio fallito', { exact: true })).toBeVisible();
        const retry = page.getByRole('button', { name: 'Riprova', exact: true });
        await retry.focus();
        await retry.press('Enter');
        await expect.poll(() => attempts).toBe(2);
        await expect(page.getByText('Salvataggio fallito', { exact: true })).toHaveCount(0);
      } else {
        let warning = '';
        page.once('dialog', async (dialog) => {
          warning = dialog.type();
          await dialog.dismiss();
        });
        await page.getByRole('button', { name: 'Chiudi', exact: true }).click();
        await expect.poll(() => warning).toBe('beforeunload');
        releaseSave.resolve();
      }

      const prisma = getPrismaClient();
      await expect.poll(() => prisma.material.count({ where: { userId: id, toolId } })).toBe(1);
      await page.goto('/it');
      await page.reload();
      const response = await page.request.get(`/api/materials/${toolId}`);
      expect(response.ok()).toBe(true);
      expect(await response.json()).toMatchObject({ material: { toolId, title, content } });
      const rows = await prisma.material.findMany({ where: { userId: id, toolId } });
      expect(rows).toHaveLength(1);
      expect(JSON.parse(rows[0].content)).toEqual(content);
      expect(attempts).toBe(scenario === 'network retry' ? 2 : 1);
      await test.info().attach('material-persistence-receipt', {
        body: JSON.stringify({ scenario, toolId, title, records: rows.length, attempts }),
        contentType: 'application/json',
      });
    } finally {
      releaseSave.resolve();
    }
  });
}
