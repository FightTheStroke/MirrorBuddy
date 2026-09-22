import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures/user-fixtures';
import { getPrismaClient } from './helpers/prisma-setup';
import { mockConsentStorage, mockTrialConsentCookie } from './fixtures/api-mocks';
import { snapshotSchema } from '../src/lib/mindmap/protocol';

test('rendered library map recovers an independent write after ten seconds offline, reloads exactly and supports local undo', async ({
  request,
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const { id: userId } = await (await request.get('/api/user')).json();
  await getPrismaClient().profile.update({ where: { userId }, data: { age: 16 } });
  const { csrfToken } = await (await request.get('/api/session')).json();
  const headers = { 'x-csrf-token': csrfToken };
  const identity = { sessionId: `voice-${randomUUID()}`, toolId: randomUUID() };
  const title = `Recovery ${identity.toolId}`;
  const initialized = await request.post('/api/tools/mindmap', {
    headers,
    data: {
      ...identity,
      content: {
        title,
        nodes: [
          {
            id: 'root',
            label: 'Cells',
            color: '#123456',
            children: [{ id: 'child', label: 'Nucleus', color: '#654321' }],
          },
        ],
      },
    },
  });
  expect(initialized.status()).toBe(200);
  const reader = await browser.newContext({
    baseURL,
    storageState: await request.storageState(),
    offline: true,
  });
  await mockConsentStorage(reader);
  await mockTrialConsentCookie(reader);
  const page = await reader.newPage();
  await page.addInitScript(() => {
    // Timers were tracked by matching function names in the stack, which a
    // production build minifies away: the count stayed at zero and the spec
    // failed on its own instrumentation rather than on a leak. Counting every
    // pending timer against a baseline taken with the map closed measures the
    // same leak and survives minification.
    const active = new Set<number>();
    const schedule = window.setTimeout.bind(window);
    const cancel = window.clearTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
      if (typeof handler !== 'function') return schedule(handler, delay);
      const id = schedule(() => {
        active.delete(id);
        handler(...args);
      }, delay);
      active.add(id);
      return id;
    }) as typeof window.setTimeout;
    window.clearTimeout = (id) => {
      if (id !== undefined) active.delete(id);
      cancel(id);
    };
    Object.defineProperty(window, 'activeFunctionTimeoutCount', { get: () => active.size });
  });
  const connections = new Set<object>();
  let opened = 0;
  page.on('request', (event) => {
    if (event.url().includes('/api/tools/stream?')) {
      connections.add(event);
      opened++;
    }
  });
  const remove = (event: object) => connections.delete(event);
  page.on('requestfinished', remove);
  page.on('requestfailed', remove);
  try {
    // Playwright deduplicates false -> false; force a real online baseline before navigation.
    await reader.setOffline(false);
    await page.goto('/it/supporti');
    await page.getByText(title, { exact: true }).click();
    const map = page.getByTestId('durable-mindmap');
    await expect(map).toHaveAttribute('data-revision', '0', { timeout: 30_000 });
    await expect(map.getByLabel('Nuovo nodo', { exact: true })).toBeEnabled();
    await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(true);
    await reader.setOffline(true);
    const offlineAt = Date.now();
    const changed = await request.post('/api/tools/stream/modify', {
      headers,
      data: {
        ...identity,
        operationId: randomUUID(),
        baseRevision: 0,
        command: 'mindmap_add_node',
        args: { concept: 'Membrane', parentNode: 'root' },
      },
    });
    expect(changed.status()).toBe(200);
    await page.waitForTimeout(Math.max(0, 10_000 - (Date.now() - offlineAt)));
    await expect(map.getByLabel('Nuovo nodo', { exact: true })).toBeDisabled();
    const onlineAt = Date.now();
    await reader.setOffline(false);
    await expect(map).toHaveAttribute('data-revision', '1', { timeout: 30_000 });
    const recoveryMs = Date.now() - onlineAt;
    expect(recoveryMs).toBeLessThanOrEqual(30_000);
    const canonical = snapshotSchema.parse(
      await (await request.get(`/api/tools/mindmap?${new URLSearchParams(identity)}`)).json(),
    );
    const row = await getPrismaClient().material.findUniqueOrThrow({
      where: { toolId: identity.toolId },
    });
    expect(JSON.parse(row.content)).toEqual(canonical.content);
    expect(canonical.content.nodes[0].children).toHaveLength(2);
    await page.reload();
    await page.getByText(title, { exact: true }).click();
    await expect(map).toHaveAttribute('data-revision', '1');
    await expect(map.locator('li')).toHaveText(['Cells', 'Nucleus', 'Membrane']);
    await expect(map.locator('li').first()).toHaveAttribute(
      'id',
      `mindmap-node-${identity.toolId}-root`,
    );
    await expect.poll(() => map.locator('svg g.markmap-node').count()).toBe(4);
    await expect(map.getByRole('tree')).toContainText('Membrane');
    await expect(
      map.locator('g.markmap-node').filter({ hasText: 'Cells' }).locator('circle'),
    ).toHaveAttribute('stroke', '#123456');
    const displayed = await map.locator('g.markmap-node').evaluateAll((elements) => {
      interface Node {
        content: string;
        payload?: { mindmapId?: string; mindmapColor?: string };
        children: Node[];
      }
      return elements
        .map((element) => (element as Element & { __data__: Node }).__data__)
        .filter((node) => node.payload?.mindmapId)
        .map((node) => ({
          id: node.payload?.mindmapId,
          label: node.content,
          color: node.payload?.mindmapColor ?? null,
          children: node.children.map((child) => child.payload?.mindmapId),
        }));
    });
    const expected: Array<{ id: string; label: string; color: string | null; children: string[] }> =
      [];
    const collect = (nodes: typeof canonical.content.nodes) => {
      for (const node of nodes) {
        expected.push({
          id: node.id,
          label: node.label,
          color: node.color ?? null,
          children: node.children.map((child) => child.id),
        });
        collect(node.children);
      }
    };
    collect(canonical.content.nodes);
    expect(Object.fromEntries(displayed.map((node) => [node.id, node]))).toEqual(
      Object.fromEntries(expected.map((node) => [node.id, node])),
    );
    await map.getByLabel('Nuovo nodo', { exact: true }).fill('Local edit');
    await map.getByRole('button', { name: 'Aggiungi nodo' }).click();
    await expect(map).toHaveAttribute('data-revision', '2');
    await map.getByRole('button', { name: /annulla|undo/i }).click();
    await expect(map).toHaveAttribute('data-revision', '3');
    const undone = await (
      await request.get(`/api/tools/mindmap?${new URLSearchParams(identity)}`)
    ).json();
    expect(undone.content).toEqual(canonical.content);
    await page.keyboard.press('Escape');
    await expect(map).toHaveCount(0);
    await expect.poll(() => connections.size).toBe(0);
    const session = await reader.newCDPSession(page);
    const listeners: number[] = [];
    for (let cycle = 0; cycle < 10; cycle++) {
      await page.getByText(title, { exact: true }).click();
      await expect(map.getByLabel('Nuovo nodo', { exact: true })).toBeEnabled();
      expect(connections.size).toBe(1);
      expect(
        await page.evaluate(() => Reflect.get(window, 'activeFunctionTimeoutCount')),
      ).toBeGreaterThan(0);
      await reader.setOffline(true);
      await expect(map.getByLabel('Nuovo nodo', { exact: true })).toBeDisabled();
      await page.keyboard.press('Escape');
      await expect(map).toHaveCount(0);
      await reader.setOffline(false);
      await expect.poll(() => connections.size).toBe(0);
      await expect
        .poll(() => page.evaluate(() => Reflect.get(window, 'activeFunctionTimeoutCount')))
        .toBe(0);
      await session.send('HeapProfiler.collectGarbage');
      listeners.push((await session.send('Memory.getDOMCounters')).jsEventListeners);
    }
    expect(listeners[9]).toBeLessThanOrEqual(listeners[0] + 5);
    await session.detach();
    console.log(
      `RENDERED_RECOVERY offline10s recoveryMs=${recoveryMs}; exact rendered reload tree and durable undo; cycles=10 opened=${opened} closedActive=${connections.size} functionTimeouts=0 listeners=${listeners.join(',')}`,
    );
  } finally {
    await reader.setOffline(false);
    await reader.close();
  }
});
