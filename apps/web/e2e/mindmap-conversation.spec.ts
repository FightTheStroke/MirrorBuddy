import { randomUUID, randomInt } from 'node:crypto';
import { test, expect } from './fixtures/user-fixtures';
import { getPrismaClient } from './helpers/prisma-setup';
import { mockConsentStorage, mockTrialConsentCookie } from './fixtures/api-mocks';
import { waitForSettledChrome, waitForSettledMessages } from './fixtures/chat-render-stability';
import { snapshotSchema } from '../src/lib/mindmap/protocol';
import { z } from 'zod';

for (const mode of ['authenticated', 'trial'] as const) {
  test(`${mode} conversation creates and reopens the same durable rendered map without paid inference`, async ({
    browser,
    request,
    baseURL,
  }) => {
    test.setTimeout(90_000);
    const context = await browser.newContext({
      baseURL,
      storageState: mode === 'trial' ? { cookies: [], origins: [] } : await request.storageState(),
      extraHTTPHeaders:
        mode === 'trial'
          ? { 'x-forwarded-for': `127.25.${randomInt(1, 254)}.${randomInt(1, 254)}` }
          : {},
    });
    let trialId: string | undefined;
    const toolId = randomUUID();
    const title = `Conversation ${toolId}`;
    const page = await context.newPage();
    try {
      if (mode === 'trial') {
        const { csrfToken } = await (await context.request.get('/api/session')).json();
        const headers = { 'x-csrf-token': csrfToken };
        expect((await context.request.post('/api/trial/session', { headers })).status()).toBe(403);
        await mockTrialConsentCookie(context);
        const created = await context.request.post('/api/trial/session', { headers });
        expect(created.status()).toBe(200);
        trialId = (await created.json()).sessionId;
        expect(trialId).toBeTruthy();
        expect(
          (await context.cookies()).some((cookie) => cookie.name === 'mirrorbuddy-user-id'),
        ).toBe(false);
      } else {
        const { id: userId } = await (await request.get('/api/user')).json();
        await getPrismaClient().profile.update({ where: { userId }, data: { age: 16 } });
      }
      await mockConsentStorage(context);
      await mockTrialConsentCookie(context);
      await page.route('**/api/realtime/ephemeral-token', (route) =>
        route.fulfill({ status: 503, json: { error: 'Paid voice belongs to C6, not this test' } }),
      );
      await page.route('**/api/chat', (route) =>
        route.fulfill({
          json: {
            content: 'Here is your mindmap.',
            toolCalls: [
              {
                id: toolId,
                name: 'create_mindmap',
                type: 'mindmap',
                status: 'completed',
                arguments: {},
                result: {
                  success: true,
                  data: {
                    title,
                    nodes: [{ id: 'root', label: 'Cell', color: '#123456' }],
                  },
                },
              },
            ],
          },
        }),
      );
      const create = async () => {
        await page.goto('/it/maestri/noether', { waitUntil: 'domcontentloaded' });
        await waitForSettledChrome(page);
        await waitForSettledMessages(page);
        await page.locator('textarea').fill('Create a map of the cell');
        await page.locator('textarea').press('Enter');
        const map = page.getByTestId('durable-mindmap').last();
        await expect(map).toHaveAttribute('data-tool-id', toolId);
        await expect(map.getByLabel('Nuovo nodo', { exact: true })).toBeEnabled();
        return map;
      };
      const map = await create();
      await map.getByLabel('Nuovo nodo', { exact: true }).fill('Persisted child');
      await map.getByRole('button', { name: 'Aggiungi nodo' }).click();
      await expect(map).toHaveAttribute('data-revision', '1');
      await page.goto('/it/supporti');
      if (mode === 'authenticated') {
        await page.getByText(title, { exact: true }).click();
        await expect(page.getByTestId('durable-mindmap')).toHaveAttribute('data-revision', '1');
        await expect(page.getByTestId('durable-mindmap').locator('li')).toHaveText([
          'Cell',
          'Persisted child',
        ]);
      } else {
        const reopened = await create();
        await expect(reopened).toHaveAttribute('data-revision', '1');
        await expect(reopened.locator('li')).toHaveText(['Cell', 'Persisted child']);
        const row = await getPrismaClient().trialSession.findUniqueOrThrow({
          where: { id: trialId },
        });
        expect((await context.request.get('/api/auth/me')).status()).toBe(401);
        expect(
          (await context.cookies()).some((cookie) => cookie.name === 'mirrorbuddy-user-id'),
        ).toBe(false);
        const stored = z.record(z.string(), snapshotSchema).parse(row.mindmaps)[toolId];
        const canonical = await context.request.get(
          `/api/tools/mindmap?${new URLSearchParams({ toolId, sessionId: trialId! })}`,
        );
        expect(await canonical.json()).toEqual(stored);
        expect(stored.revision).toBe(1);
        expect(stored.content.nodes.map((node) => node.label)).toEqual(['Cell', 'Persisted child']);
        await getPrismaClient().trialSession.update({
          where: { id: trialId },
          data: { visitorId: randomUUID() },
        });
        await expect(reopened.getByRole('status')).toContainText(
          'Accesso alla mappa non disponibile',
          { timeout: 5000 },
        );
      }
      console.log(
        `CONVERSATION mode=${mode} realIdentity realConsentCookies stableToolId revision1 reopen; AI boundary substituted; paidVoice=0`,
      );
    } finally {
      await context.close();
      if (trialId) {
        await getPrismaClient().trialSession.deleteMany({ where: { id: trialId } });
        expect(await getPrismaClient().trialSession.count({ where: { id: trialId } })).toBe(0);
      }
    }
  });
}
