// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { initializeMindmap, modifyMindmap, readMindmap } from '../service';
import { snapshotSchema, outcomeSchema } from '../protocol';

const localUrl = 'postgresql://Roberdan@localhost:5432/mirrorbuddy_test';
const enabled = process.env.TEST_DATABASE_URL === localUrl && process.env.DATABASE_URL === localUrl;
const execute = promisify(execFile);
let userId: string;
let toolId: string;
const owner = () => ({ kind: 'user' as const, userId });
const identity = () => ({ sessionId: 'voice-process-test', toolId });
const operation = () => ({
  ...identity(),
  operationId: 'process-operation',
  baseRevision: 0,
  command: 'mindmap_add_node',
  args: { concept: 'Nucleus', parentNode: 'root' },
});

async function worker(action: 'read' | 'modify', input: unknown) {
  const { stdout } = await execute(
    process.execPath,
    [
      '--conditions=react-server',
      '--import',
      'tsx',
      resolve('apps/web/src/lib/mindmap/__tests__/fixtures/process-worker.ts'),
      JSON.stringify({ action, owner: owner(), input }),
    ],
    { cwd: process.cwd(), timeout: 30000, maxBuffer: 1024 * 1024 },
  );
  const line = stdout.split('\n').find((value) => value.startsWith('MINDMAP_RESULT '));
  if (!line) throw new Error('Worker did not return a result');
  return z
    .object({ pid: z.number(), value: z.unknown() })
    .parse(JSON.parse(line.slice('MINDMAP_RESULT '.length)));
}

describe.runIf(enabled)('mindmap process and database fault boundaries', () => {
  beforeEach(async () => {
    userId = `mindmap-process-${randomUUID()}`;
    toolId = randomUUID();
    await prisma.user.create({ data: { id: userId, isTestData: true } });
    await initializeMindmap(owner(), {
      ...identity(),
      content: { title: 'Cells', nodes: [{ id: 'root', label: 'Cell', color: '#123456' }] },
    });
  });
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: userId, isTestData: true } });
    expect(await prisma.material.count({ where: { userId } })).toBe(0);
  });

  it('deduplicates two independent writer processes and reloads the exact tree in a third', async () => {
    const [first, second] = await Promise.all([
      worker('modify', operation()),
      worker('modify', operation()),
    ]);
    expect(first.pid).not.toBe(second.pid);
    expect(first.pid).not.toBe(process.pid);
    expect(outcomeSchema.parse(first.value)).toEqual(outcomeSchema.parse(second.value));
    const reader = await worker('read', identity());
    expect([first.pid, second.pid, process.pid]).not.toContain(reader.pid);
    const snapshot = snapshotSchema.parse(reader.value);
    const database = await prisma.material.findUniqueOrThrow({ where: { toolId } });
    expect(snapshot.content).toEqual(JSON.parse(database.content));
    expect(snapshot.revision).toBe(1);
    expect(snapshot.content.nodes[0].color).toBe('#123456');
    expect(snapshot.content.nodes[0].children).toHaveLength(1);
    console.log(
      `Independent mindmap processes: writers=${first.pid},${second.pid}; reader=${reader.pid}`,
    );
  }, 45000);

  it('propagates a real rejected DB write; retrying the same operation is safe after recovery', async () => {
    const before = await readMindmap(owner(), identity());
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        return modifyMindmap(owner(), operation(), tx);
      }),
    ).rejects.toThrow();
    expect(await readMindmap(owner(), identity())).toEqual(before);
    const receipt = await modifyMindmap(owner(), operation());
    expect(receipt.revision).toBe(1);
    expect(await modifyMindmap(owner(), operation())).toEqual(receipt);
  });
});
