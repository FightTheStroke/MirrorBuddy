import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Browser } from '@playwright/test';
import { expect } from '../fixtures/user-fixtures';
import { getPrismaClient } from './prisma-setup';
import { mockConsentStorage, mockTrialConsentCookie } from '../fixtures/api-mocks';

export async function openOwnedMap(request: APIRequestContext, browser: Browser, baseURL?: string) {
  const { id: userId } = await (await request.get('/api/user')).json();
  await getPrismaClient().profile.update({ where: { userId }, data: { age: 16 } });
  const { csrfToken } = await (await request.get('/api/session')).json();
  const headers = { 'x-csrf-token': csrfToken };
  const identity = { toolId: randomUUID(), sessionId: `voice-${randomUUID()}` };
  const title = `Map ${identity.toolId}`;
  const initialized = await request.post('/api/tools/mindmap', {
    headers,
    data: {
      ...identity,
      content: { title, nodes: [{ id: 'root', label: 'Cell', color: '#123456' }] },
    },
  });
  expect(initialized.status()).toBe(200);
  const context = await browser.newContext({ baseURL, storageState: await request.storageState() });
  await mockConsentStorage(context);
  await mockTrialConsentCookie(context);
  const page = await context.newPage();
  await page.goto('/it/supporti');
  await page.getByText(title, { exact: true }).click();
  const map = page.getByTestId('durable-mindmap');
  await expect(map.getByLabel('Nuovo nodo', { exact: true })).toBeEnabled();
  const read = async () =>
    (await request.get(`/api/tools/mindmap?${new URLSearchParams(identity)}`)).json();
  return { context, page, map, read, identity, title, headers, userId };
}
