import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures/user-fixtures';
import { getPrismaClient } from './helpers/prisma-setup';
import { openMindmapStream } from './helpers/mindmap-stream';

test.beforeEach(async ({ request }) => {
  const { id: userId } = await (await request.get('/api/user')).json();
  await getPrismaClient().profile.update({ where: { userId }, data: { age: 16 } });
});

test('storage failure is explicit and cannot report a committed command or keep streaming', async ({
  request,
  baseURL,
}) => {
  const { csrfToken } = await (await request.get('/api/session')).json();
  const headers = { 'x-csrf-token': csrfToken };
  const identity = { sessionId: `voice-${randomUUID()}`, toolId: randomUUID() };
  expect(
    (
      await request.post('/api/tools/mindmap', {
        headers,
        data: { ...identity, content: { title: 'Map', nodes: [] } },
      })
    ).status(),
  ).toBe(200);
  const stream = await openMindmapStream(
    request,
    `${baseURL}/api/tools/stream?${new URLSearchParams(identity)}`,
  );
  try {
    expect(await stream.next()).toMatchObject({ event: 'mindmap:snapshot' });
    await getPrismaClient().material.update({
      where: { toolId: identity.toolId },
      data: { content: '{invalid' },
    });
    const failed = await request.patch('/api/tools/mindmap', {
      headers,
      data: {
        ...identity,
        operationId: 'fault',
        baseRevision: 0,
        command: 'mindmap_add_node',
        args: { concept: 'Cell' },
      },
    });
    expect(failed.status()).toBe(500);
    expect(await stream.next()).toMatchObject({ event: 'mindmap:error', data: { status: 500 } });
    expect(await stream.next()).toBeNull();
    expect(
      await getPrismaClient().material.findUnique({ where: { toolId: identity.toolId } }),
    ).toMatchObject({ mindmapRevision: 0, mindmapReceipts: [] });
  } finally {
    await stream.close();
  }
});

test('ten HTTP open/cancel cycles and four independent readers recover the exact committed state', async ({
  request,
  playwright,
  baseURL,
}) => {
  const { csrfToken } = await (await request.get('/api/session')).json();
  const identity = { sessionId: `voice-${randomUUID()}`, toolId: randomUUID() };
  const headers = { 'x-csrf-token': csrfToken };
  const initialized = await request.post('/api/tools/mindmap', {
    headers,
    data: {
      ...identity,
      content: { title: 'Concurrent', nodes: [{ id: 'root', label: 'Root' }] },
    },
  });
  expect(initialized.status()).toBe(200);
  const first = await initialized.json();
  const url = `${baseURL}/api/tools/stream?${new URLSearchParams(identity)}`;
  const durations: number[] = [];
  for (let cycle = 0; cycle < 10; cycle++) {
    const start = Date.now();
    const stream = await openMindmapStream(request, url);
    try {
      expect(await stream.next()).toEqual({ event: 'mindmap:snapshot', data: first });
    } finally {
      await stream.close();
    }
    durations.push(Date.now() - start);
  }
  const streams = await Promise.all(
    Array.from({ length: 4 }, () => openMindmapStream(request, url)),
  );
  const writer = await playwright.request.newContext({
    baseURL,
    storageState: await request.storageState(),
  });
  try {
    for (const stream of streams)
      expect(await stream.next()).toEqual({ event: 'mindmap:snapshot', data: first });
    const start = Date.now();
    expect(
      (
        await writer.patch('/api/tools/mindmap', {
          headers,
          data: {
            ...identity,
            operationId: randomUUID(),
            baseRevision: 0,
            command: 'mindmap_set_color',
            args: { node: 'root', color: '#123456' },
          },
        })
      ).status(),
    ).toBe(200);
    const snapshots = await Promise.all(streams.map((stream) => stream.next()));
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(4000);
    const canonical = await (
      await writer.get(`/api/tools/mindmap?${new URLSearchParams(identity)}`)
    ).json();
    expect(canonical.revision).toBe(1);
    for (const snapshot of snapshots)
      expect(snapshot).toEqual({ event: 'mindmap:snapshot', data: canonical });
    console.log(
      `Mindmap HTTP: 10 cycles max ${Math.max(...durations)}ms; 4 readers update ${elapsed}ms`,
    );
  } finally {
    await Promise.all(streams.map((stream) => stream.close()));
    await writer.dispose();
  }
});
