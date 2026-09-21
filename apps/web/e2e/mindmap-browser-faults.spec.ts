import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures/user-fixtures';
import { getPrismaClient } from './helpers/prisma-setup';
import { openOwnedMap } from './helpers/mindmap-browser';

test('lost response after commit retains exact operation across view reopen and retries only once', async ({
  request,
  browser,
  baseURL,
}) => {
  test.setTimeout(60_000);
  const view = await openOwnedMap(request, browser, baseURL);
  const envelopes: string[] = [];
  let accepted = false;
  await view.page.route('**/api/tools/stream/modify', async (route) => {
    envelopes.push(route.request().postData() ?? '');
    if (envelopes.length !== 1) return route.continue();
    const result = await route.fetch();
    expect(result.status()).toBe(200);
    accepted = true;
    await route.abort('failed');
  });
  try {
    await view.map.getByLabel('Nuovo nodo', { exact: true }).fill('Accepted once');
    await view.map.getByRole('button', { name: 'Aggiungi nodo' }).click();
    await expect.poll(() => accepted).toBe(true);
    await expect(view.map.getByRole('alert')).toBeVisible();
    await view.page.keyboard.press('Escape');
    await expect(view.map).toHaveCount(0);
    await view.page.getByText(view.title, { exact: true }).click();
    await expect(view.map.getByRole('button', { name: 'Riprova', exact: true })).toBeVisible();
    await expect(view.map).toHaveAttribute('data-revision', '1');
    await view.map.getByRole('button', { name: 'Riprova', exact: true }).click();
    await expect.poll(() => envelopes.length).toBe(2);
    expect(envelopes[1]).toBe(envelopes[0]);
    await expect(view.map.getByRole('alert')).toHaveCount(0);
    const snapshot = await view.read();
    expect(snapshot.revision).toBe(1);
    expect(
      snapshot.content.nodes.filter((node: { label: string }) => node.label === 'Accepted once'),
    ).toHaveLength(1);
    console.log('RESPONSE_LOSS same exact envelope after reopen; revision=1; mutationCount=1');
  } finally {
    await view.context.close();
  }
});

test('independent writer conflict preserves inspectable pending intent without overwriting the server', async ({
  request,
  browser,
  baseURL,
}) => {
  const view = await openOwnedMap(request, browser, baseURL);
  const attempted: string[] = [];
  await view.page.route('**/api/tools/stream/modify', async (route) => {
    attempted.push(route.request().postData() ?? '');
    if (attempted.length === 1) {
      const other = await request.post('/api/tools/stream/modify', {
        headers: view.headers,
        data: {
          ...view.identity,
          operationId: randomUUID(),
          baseRevision: 0,
          command: 'mindmap_set_color',
          args: { node: 'root', color: '#abcdef' },
        },
      });
      expect(other.status()).toBe(200);
    }
    await route.continue();
  });
  try {
    await view.map.getByLabel('Nuovo nodo', { exact: true }).fill('My preserved intention');
    await view.map.getByRole('button', { name: 'Aggiungi nodo' }).click();
    await expect(view.map.getByRole('alert')).toContainText('cambiata altrove');
    await view.map.locator('summary').click();
    await expect(view.map.locator('pre')).toContainText('My preserved intention');
    const before = await view.read();
    expect(before.revision).toBe(1);
    expect(before.content.nodes).toHaveLength(1);
    expect(before.content.nodes[0].color).toBe('#abcdef');
    await expect(view.map).toHaveAttribute('data-revision', '1');
    await view.map.getByRole('button', { name: 'Riprova', exact: true }).click();
    await expect.poll(() => attempted.length).toBe(2);
    expect(attempted[1]).toBe(attempted[0]);
    expect(await view.read()).toEqual(before);
    await expect(view.map.getByRole('alert')).toContainText('cambiata altrove');
    console.log('CONFLICT real409 exact retry; pending visible; independent tree unchanged');
  } finally {
    await view.context.close();
  }
});

for (const status of [401, 403]) {
  test(`real ${status} revocation terminates browser stream and online storms cannot restart it`, async ({
    request,
    browser,
    baseURL,
  }) => {
    test.setTimeout(60_000);
    const view = await openOwnedMap(request, browser, baseURL);
    let attempts = 0;
    view.page.on('request', (r) => {
      if (r.url().includes('/api/tools/stream?')) attempts++;
    });
    try {
      const start = Date.now();
      if (status === 401)
        await getPrismaClient().authSession.updateMany({
          where: { userId: view.userId },
          data: { revokedAt: new Date() },
        });
      else
        await getPrismaClient().material.update({
          where: { toolId: view.identity.toolId },
          data: { mindmapSourceSession: 'changed-binding' },
        });
      await expect(view.map.getByRole('status')).toContainText(
        'Accesso alla mappa non disponibile',
        { timeout: 5000 },
      );
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
      const terminalAttempts = attempts;
      await view.page.evaluate(() => {
        for (let n = 0; n < 20; n++) window.dispatchEvent(new Event('online'));
      });
      await view.page.waitForTimeout(9000);
      expect(attempts).toBe(terminalAttempts);
      await expect(view.map.getByLabel('Nuovo nodo', { exact: true })).toBeDisabled();
      const response = view.page.waitForResponse((r) => r.url().includes('/api/tools/stream?'));
      await view.map.getByRole('button', { name: 'Riprova', exact: true }).click();
      expect((await response).status()).toBe(status);
      await expect(view.map.getByRole('status')).toContainText(
        'Accesso alla mappa non disponibile',
      );
      console.log(
        `TERMINAL status=${status} revocationMs=${elapsed} onlineEvents=20 automaticRestarts=0 manualHttp=${status}`,
      );
    } finally {
      await view.context.close();
    }
  });
}
