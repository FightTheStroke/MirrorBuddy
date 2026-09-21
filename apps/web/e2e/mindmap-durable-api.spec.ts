import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures/user-fixtures';
import { getPrismaClient } from './helpers/prisma-setup';

test.describe('durable mindmap HTTP protocol', () => {
  test.beforeEach(async ({ request }) => {
    const { id: userId } = await (await request.get('/api/user')).json();
    await getPrismaClient().profile.update({ where: { userId }, data: { age: 16 } });
  });
  test('initializes once, reads owned state and deduplicates commands through real middleware', async ({
    request,
  }) => {
    const { csrfToken } = await (await request.get('/api/session')).json();
    const headers = { 'x-csrf-token': csrfToken };
    const identity = { sessionId: `voice-${randomUUID()}`, toolId: randomUUID() };
    const content = { title: 'Cells', nodes: [{ id: 'root', label: 'Cell', color: '#123456' }] };
    const initialized = await request.post('/api/tools/mindmap', {
      headers,
      data: { ...identity, content },
    });
    expect(initialized.status()).toBe(200);
    const first = await initialized.json();
    expect(first).toMatchObject({ ...identity, revision: 0, content: { title: 'Cells' } });
    const reopened = await request.post('/api/tools/mindmap', {
      headers,
      data: { ...identity, content: { title: 'Stale', nodes: [] } },
    });
    expect(await reopened.json()).toEqual(first);
    const operation = {
      ...identity,
      operationId: randomUUID(),
      baseRevision: 0,
      command: 'mindmap_add_node',
      args: { concept: 'Nucleus', parentNode: 'root' },
    };
    const results = await Promise.all(
      [1, 2].map(() => request.post('/api/tools/stream/modify', { headers, data: operation })),
    );
    expect(results.map((result) => result.status())).toEqual([200, 200]);
    expect(await results[0].json()).toEqual(await results[1].json());
    const read = await request.get(`/api/tools/mindmap?${new URLSearchParams(identity)}`);
    expect(read.status()).toBe(200);
    const snapshot = await read.json();
    expect(snapshot.revision).toBe(1);
    expect(snapshot.content.nodes[0].children).toHaveLength(1);
    expect(snapshot.content.nodes[0].color).toBe('#123456');
    const row = await getPrismaClient().material.findUniqueOrThrow({
      where: { toolId: identity.toolId },
    });
    expect(snapshot.content).toEqual(JSON.parse(row.content));
    expect(row.sessionId).toBeNull();
    const conflict = await request.post('/api/tools/stream/modify', {
      headers,
      data: { ...operation, operationId: randomUUID() },
    });
    expect(conflict.status()).toBe(409);
  });

  test('requires CSRF before authentication and validates command envelopes', async ({
    request,
    playwright,
    baseURL,
  }) => {
    const anonymous = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    try {
      const response = await anonymous.post('/api/tools/mindmap', { data: {} });
      expect(response.status()).toBe(403);
      expect((await response.json()).error).toContain('CSRF');
      const { csrfToken } = await (await request.get('/api/session')).json();
      const malformed = await request.post('/api/tools/stream/modify', {
        headers: { 'x-csrf-token': csrfToken },
        data: null,
      });
      expect(malformed.status()).toBe(400);
    } finally {
      await anonymous.dispose();
    }
  });

  test('voice creation uses the supplied stable identity and persists before reporting success', async ({
    request,
  }) => {
    const { csrfToken } = await (await request.get('/api/session')).json();
    const identity = { sessionId: `voice-${randomUUID()}`, toolId: randomUUID() };
    const data = {
      ...identity,
      toolType: 'mindmap',
      maestroId: 'euclide',
      title: 'Geometry',
      content: { title: 'Geometry', nodes: [{ id: 'triangle', label: 'Triangle' }] },
    };
    const first = await request.post('/api/tools/create', {
      headers: { 'x-csrf-token': csrfToken },
      data,
    });
    expect(first.status()).toBe(200);
    expect(await first.json()).toMatchObject({
      success: true,
      toolId: identity.toolId,
      revision: 0,
    });
    const second = await request.post('/api/tools/create', {
      headers: { 'x-csrf-token': csrfToken },
      data,
    });
    expect(second.status()).toBe(200);
    expect(await getPrismaClient().material.count({ where: { toolId: identity.toolId } })).toBe(1);
  });

  test('focus is visual only and caller owner fields cannot override authenticated ownership', async ({
    request,
    context,
  }) => {
    const { csrfToken } = await (await request.get('/api/session')).json();
    const headers = { 'x-csrf-token': csrfToken };
    const identity = { sessionId: `voice-${randomUUID()}`, toolId: randomUUID() };
    const { id: otherUser } = await (await context.request.get('/api/user')).json();
    const initialized = await request.post('/api/tools/mindmap', {
      headers,
      data: {
        ...identity,
        userId: otherUser,
        content: {
          title: 'Cells',
          nodes: [{ id: 'root', label: 'Cell', color: '#123456' }],
        },
      },
    });
    expect(initialized.status()).toBe(200);
    const before = await getPrismaClient().material.findUniqueOrThrow({
      where: { toolId: identity.toolId },
    });
    expect(before.userId).not.toBe(otherUser);
    const focus = await request.post('/api/tools/stream/modify', {
      headers,
      data: {
        ...identity,
        operationId: 'focus-1',
        baseRevision: 0,
        command: 'mindmap_focus_node',
        args: { node: 'root' },
      },
    });
    expect(focus.status()).toBe(200);
    expect(await focus.json()).toEqual({
      toolId: identity.toolId,
      operationId: 'focus-1',
      revision: 0,
      focus: { nodeId: 'root', label: 'Cell' },
    });
    expect(
      await getPrismaClient().material.findUniqueOrThrow({ where: { toolId: identity.toolId } }),
    ).toEqual(before);
    const rebind = await request.post('/api/tools/mindmap', {
      headers,
      data: { ...identity, sessionId: 'voice-other', content: { title: 'Overwrite', nodes: [] } },
    });
    expect(rebind.status()).toBe(403);
  });

  test('all mindmap mutation entry points retain the real parental-consent restriction', async ({
    request,
  }) => {
    const { id: userId } = await (await request.get('/api/user')).json();
    await getPrismaClient().profile.update({ where: { userId }, data: { age: 12 } });
    const { csrfToken } = await (await request.get('/api/session')).json();
    for (const url of ['/api/tools/create', '/api/tools/mindmap', '/api/tools/stream/modify']) {
      const response = await request.post(url, {
        headers: { 'x-csrf-token': csrfToken },
        data: { toolType: 'mindmap', sessionId: 'voice-denied', toolId: randomUUID() },
      });
      expect(response.status()).toBe(403);
      expect((await response.json()).error).toBe('Parental consent required');
    }
  });
});
