import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures/user-fixtures';
import { getPrismaClient } from './helpers/prisma-setup';
import { openMindmapStream } from './helpers/mindmap-stream';

test('counts isolated app PostgreSQL protocol executions with one and four active readers', async ({
  request,
  baseURL,
}, testInfo) => {
  test.skip(
    !testInfo.config.configFile?.endsWith('mindmap-proxy.config.ts'),
    'Requires session-local protocol counter and app-only proxy configuration',
  );
  test.setTimeout(90_000);
  const count = async () => {
    const response = await fetch('http://127.0.0.1:35477/counts');
    if (!response.ok) throw new Error('Local protocol counter unavailable');
    return response.json() as Promise<{
      execute: number;
      simpleQuery: number;
      completed: number;
      errors: number;
    }>;
  };
  const { id: userId } = await (await request.get('/api/user')).json();
  await getPrismaClient().profile.update({ where: { userId }, data: { age: 16 } });
  const { csrfToken } = await (await request.get('/api/session')).json();
  const identity = { toolId: randomUUID(), sessionId: `voice-${randomUUID()}` };
  expect(
    (
      await request.post('/api/tools/mindmap', {
        headers: { 'x-csrf-token': csrfToken },
        data: { ...identity, content: { title: 'Measured map', nodes: [] } },
      })
    ).status(),
  ).toBe(200);
  const observe = async (readers: number, duration: number) => {
    const before = await count();
    const start = Date.now();
    await new Promise((resolve) => setTimeout(resolve, duration));
    const after = await count();
    const elapsedMs = Date.now() - start;
    const executions = after.execute + after.simpleQuery - before.execute - before.simpleQuery;
    const completions = after.completed - before.completed;
    expect(after.errors - before.errors).toBe(0);
    console.log(
      `DB_PROTOCOL readers=${readers} windowMs=${elapsedMs} executions=${executions} completions=${completions} totalAppQps=${((executions * 1000) / elapsedMs).toFixed(3)}`,
    );
    return executions;
  };
  expect(await observe(0, 4200)).toBe(0);
  const rates: number[] = [];
  for (const readers of [1, 4]) {
    const streams = await Promise.all(
      Array.from({ length: readers }, () =>
        openMindmapStream(
          request,
          `${baseURL}/api/tools/stream?${new URLSearchParams(identity)}`,
          baseURL,
        ),
      ),
    );
    try {
      for (const stream of streams)
        expect(await stream.next()).toMatchObject({ event: 'mindmap:snapshot' });
      const queries = await observe(readers, 10_500);
      expect(queries).toBeGreaterThanOrEqual(readers * 5);
      rates.push(queries);
    } finally {
      await Promise.all(streams.map((stream) => stream.close()));
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await observe(0, 4200)).toBe(0);
  }
  expect(rates[1]).toBeGreaterThan(rates[0]);
});
