import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures/user-fixtures';
import { getPrismaClient } from './helpers/prisma-setup';
import { openMindmapStream } from './helpers/mindmap-stream';
import {
  VISITOR_COOKIE_NAME,
  AUTH_COOKIE_NAME,
  TRIAL_CONSENT_COOKIE,
} from '../src/lib/auth/cookie-constants';

test.describe('database-backed mindmap stream', () => {
  test.beforeEach(async ({ request }) => {
    const { id: userId } = await (await request.get('/api/user')).json();
    await getPrismaClient().profile.update({ where: { userId }, data: { age: 16 } });
  });
  test('sends initial and committed snapshots, then terminates on real session revocation', async ({
    request,
    baseURL,
  }) => {
    const { csrfToken } = await (await request.get('/api/session')).json();
    const identity = { sessionId: `voice-${randomUUID()}`, toolId: randomUUID() };
    const headers = { 'x-csrf-token': csrfToken };
    const initialized = await request.post('/api/tools/mindmap', {
      headers,
      data: { ...identity, content: { title: 'Cells', nodes: [{ id: 'root', label: 'Cell' }] } },
    });
    expect(initialized.status()).toBe(200);
    const first = await initialized.json();
    const stream = await openMindmapStream(
      request,
      `${baseURL}/api/tools/stream?${new URLSearchParams(identity)}`,
    );
    try {
      expect(stream.status).toBe(200);
      expect(await stream.next()).toEqual({ event: 'mindmap:snapshot', data: first });
      const changed = await request.post('/api/tools/stream/modify', {
        headers,
        data: {
          ...identity,
          operationId: randomUUID(),
          baseRevision: 0,
          command: 'mindmap_set_color',
          args: { node: 'root', color: 'blue' },
        },
      });
      expect(changed.status()).toBe(200);
      expect(await stream.next()).toMatchObject({
        event: 'mindmap:snapshot',
        data: {
          ...identity,
          revision: 1,
          content: { nodes: [{ color: '#3b82f6' }] },
        },
      });
      const { id: userId } = await (await request.get('/api/user')).json();
      const start = Date.now();
      await getPrismaClient().authSession.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
      expect(await stream.next()).toMatchObject({ event: 'mindmap:error', data: { status: 401 } });
      expect(Date.now() - start).toBeLessThan(4000);
      console.log(`Mindmap real revocation observed in ${Date.now() - start}ms`);
      expect(await stream.next()).toBeNull();
      expect(
        (await request.get(`/api/tools/stream?${new URLSearchParams(identity)}`)).status(),
      ).toBe(401);
    } finally {
      await stream.close();
    }
  });

  test('rejects cross-owner and cross-source requests rather than trusting a voice prefix', async ({
    request,
    context,
  }) => {
    const { csrfToken } = await (await request.get('/api/session')).json();
    const identity = { sessionId: `voice-${randomUUID()}`, toolId: randomUUID() };
    expect(
      (
        await request.post('/api/tools/mindmap', {
          headers: { 'x-csrf-token': csrfToken },
          data: { ...identity, content: { title: 'Map', nodes: [] } },
        })
      ).status(),
    ).toBe(200);
    const wrong = { ...identity, sessionId: `voice-${randomUUID()}` };
    expect((await request.get(`/api/tools/stream?${new URLSearchParams(wrong)}`)).status()).toBe(
      403,
    );
    // The global fixture is another real authenticated owner, not the per-test request owner.
    expect(
      (await context.request.get(`/api/tools/stream?${new URLSearchParams(identity)}`)).status(),
    ).toBe(403);
  });

  test('trial snapshot ownership is checked every poll; auth-only SSE remains closed to trial', async ({
    playwright,
    baseURL,
  }) => {
    const visitorId = randomUUID();
    const prisma = getPrismaClient();
    const trial = await prisma.trialSession.create({ data: { visitorId, ipHash: randomUUID() } });
    const cookies = [
      {
        name: VISITOR_COOKIE_NAME,
        value: visitorId,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
        expires: -1,
      },
    ];
    cookies.push({
      ...cookies[0],
      name: TRIAL_CONSENT_COOKIE,
      value: encodeURIComponent(JSON.stringify({ accepted: true })),
    });
    const guest = await playwright.request.newContext({
      baseURL,
      storageState: { cookies, origins: [] },
    });
    const identity = { sessionId: trial.id, toolId: randomUUID() };
    try {
      const { csrfToken } = await (await guest.get('/api/session')).json();
      expect(
        (
          await guest.post('/api/tools/mindmap', {
            headers: { 'x-csrf-token': csrfToken },
            data: { ...identity, content: { title: 'Trial map', nodes: [] } },
          })
        ).status(),
      ).toBe(200);
      const created = await guest.post('/api/tools/create', {
        headers: { 'x-csrf-token': csrfToken },
        data: {
          ...identity,
          toolType: 'mindmap',
          maestroId: 'euclide',
          title: 'Stale',
          content: { title: 'Stale', nodes: [] },
        },
      });
      expect(created.status()).toBe(200);
      expect((await created.json()).toolId).toBe(identity.toolId);
      const operation = {
        ...identity,
        operationId: randomUUID(),
        baseRevision: 0,
        command: 'mindmap_add_node',
        args: { concept: 'Cell' },
      };
      for (let delivery = 0; delivery < 2; delivery++) {
        const modified = await guest.post('/api/tools/stream/modify', {
          headers: { 'x-csrf-token': csrfToken },
          data: operation,
        });
        expect(modified.status()).toBe(200);
        expect(await modified.json()).toMatchObject({ toolId: identity.toolId, revision: 1 });
      }
      expect((await guest.get(`/api/tools/sse?${new URLSearchParams(identity)}`)).status()).toBe(
        401,
      );
      const stream = await openMindmapStream(
        guest,
        `${baseURL}/api/tools/stream?${new URLSearchParams(identity)}`,
      );
      try {
        expect(stream.status).toBe(200);
        expect(await stream.next()).toMatchObject({
          event: 'mindmap:snapshot',
          data: { ...identity, revision: 1, content: { title: 'Trial map' } },
        });
        await prisma.trialSession.update({
          where: { id: trial.id },
          data: { visitorId: randomUUID() },
        });
        expect(await stream.next()).toMatchObject({
          event: 'mindmap:error',
          data: { status: 403 },
        });
        expect(await stream.next()).toBeNull();
      } finally {
        await stream.close();
      }
      await prisma.trialSession.update({ where: { id: trial.id }, data: { visitorId } });
      const rejectedAuth = await playwright.request.newContext({
        baseURL,
        storageState: {
          cookies: [...cookies, { ...cookies[0], name: AUTH_COOKIE_NAME, value: 'rejected' }],
          origins: [],
        },
      });
      try {
        expect(
          (await rejectedAuth.get(`/api/tools/mindmap?${new URLSearchParams(identity)}`)).status(),
        ).toBe(401);
      } finally {
        await rejectedAuth.dispose();
      }
    } finally {
      await guest.dispose();
      await prisma.trialSession.deleteMany({ where: { id: trial.id } });
      expect(await prisma.trialSession.count({ where: { id: trial.id } })).toBe(0);
    }
  });
});
