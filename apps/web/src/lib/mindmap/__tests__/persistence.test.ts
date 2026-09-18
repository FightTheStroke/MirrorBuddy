// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { initializeMindmap, readMindmap, modifyMindmap } from '../service';
import type { MindmapOwner } from '../storage';
import { saveOwnedMaterial, updateOwnedMaterial } from '@/app/api/materials/ownership';
import { saveMaterialsFromStudyKit } from '@/lib/study-kit/sync-materials';

const localUrl = 'postgresql://Roberdan@localhost:5432/mirrorbuddy_test';
const enabled = process.env.TEST_DATABASE_URL === localUrl && process.env.DATABASE_URL === localUrl;
const content = {
  title: 'Cells',
  nodes: [{ id: 'root', label: 'Cell', color: '#123456', children: [] }],
};
let userId: string;
let trialId: string;
let visitorId: string;
let toolId: string;
let owner: MindmapOwner;
const sessionId = 'voice-durable-test';
const input = () => ({ sessionId, toolId, content });
const operation = (baseRevision = 0, operationId = 'one') => ({
  sessionId,
  toolId,
  operationId,
  baseRevision,
  command: 'mindmap_add_node',
  args: { concept: 'Nucleus', parentNode: 'root' },
});

describe.runIf(enabled)('durable mindmap persistence (real local PostgreSQL)', () => {
  beforeEach(async () => {
    userId = `mindmap-test-${randomUUID()}`;
    trialId = `mindmap-trial-${randomUUID()}`;
    visitorId = randomUUID();
    toolId = randomUUID();
    owner = { kind: 'user', userId };
    await prisma.user.create({ data: { id: userId, isTestData: true } });
    await prisma.trialSession.create({
      data: { id: trialId, visitorId, ipHash: randomUUID() },
    });
  });
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: userId, isTestData: true } });
    await prisma.trialSession.deleteMany({ where: { id: trialId, visitorId } });
    expect(await prisma.material.count({ where: { userId } })).toBe(0);
    expect(await prisma.trialSession.count({ where: { id: trialId } })).toBe(0);
  });

  it('initializes once, never overwrites, and does not misuse the StudySession foreign key', async () => {
    const first = await initializeMindmap(owner, input());
    expect(first.revision).toBe(0);
    expect(
      await initializeMindmap(owner, { ...input(), content: { title: 'Overwrite', nodes: [] } }),
    ).toEqual(first);
    const row = await prisma.material.findUniqueOrThrow({ where: { toolId } });
    expect(row.sessionId).toBeNull();
    expect(row.mindmapSourceSession).toBe(sessionId);
    expect(JSON.parse(row.content)).toEqual(first.content);
    expect(await prisma.material.count({ where: { toolId } })).toBe(1);
  });

  it('replays the prior receipt after response loss without duplicate IDs or nodes', async () => {
    await initializeMindmap(owner, input());
    const receipt = await modifyMindmap(owner, operation());
    const once = await readMindmap(owner, input());
    await modifyMindmap(owner, operation(1, 'two'));
    expect(await modifyMindmap(owner, operation())).toEqual(receipt);
    const twice = await readMindmap(owner, input());
    expect(twice.revision).toBe(2);
    expect(twice.content.nodes[0].children).toHaveLength(2);
    expect(twice.content.nodes[0].children[0]).toEqual(once.content.nodes[0].children[0]);
    expect(twice.content.nodes[0].color).toBe('#123456');
  });

  it('rejects reuse of an operation ID with different content', async () => {
    await initializeMindmap(owner, input());
    await modifyMindmap(owner, operation());
    await expect(
      modifyMindmap(owner, {
        ...operation(),
        args: { concept: 'Different' },
      }),
    ).rejects.toMatchObject({ code: 'OPERATION_ID_REUSED', status: 409 });
  });

  it('accepts one concurrent writer and explicitly conflicts the other', async () => {
    await initializeMindmap(owner, input());
    const results = await Promise.allSettled([
      modifyMindmap(owner, operation(0, 'a')),
      modifyMindmap(owner, operation(0, 'b')),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({ reason: { code: 'REVISION_CONFLICT', status: 409 } });
    expect((await readMindmap(owner, input())).revision).toBe(1);
  });

  it('deduplicates simultaneous delivery of the same command', async () => {
    await initializeMindmap(owner, input());
    const results = await Promise.all([
      modifyMindmap(owner, operation()),
      modifyMindmap(owner, operation()),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect((await readMindmap(owner, input())).content.nodes[0].children).toHaveLength(1);
  });

  it('denies another owner, wrong source session, and deleted materials', async () => {
    await initializeMindmap(owner, input());
    await expect(readMindmap({ kind: 'user', userId: 'stranger' }, input())).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      readMindmap(owner, { ...input(), sessionId: 'voice-wrong' }),
    ).rejects.toMatchObject({ status: 403 });
    await prisma.material.update({ where: { toolId }, data: { status: 'deleted' } });
    await expect(modifyMindmap(owner, operation())).rejects.toMatchObject({ status: 403 });
  });

  it('migrates an owned legacy material once and ignores stale caller content', async () => {
    await prisma.material.create({
      data: {
        userId,
        toolId,
        toolType: 'mindmap',
        title: content.title,
        content: JSON.stringify(content),
      },
    });
    const first = await initializeMindmap(owner, {
      ...input(),
      content: { title: 'Bad', nodes: [] },
    });
    expect(first.content.nodes[0].id).toBe('root');
    expect(first.content.title).toBe(content.title);
    await modifyMindmap(owner, operation());
    expect((await initializeMindmap(owner, input())).revision).toBe(1);
  });

  it('migrates only an unambiguous owned ToolOutput, retaining tool identity', async () => {
    const conversation = await prisma.conversation.create({
      data: { userId, maestroId: 'euclide' },
    });
    await prisma.toolOutput.create({
      data: {
        conversationId: conversation.id,
        toolId,
        toolType: 'mindmap',
        data: JSON.stringify(content),
      },
    });
    const saved = await initializeMindmap(owner, { sessionId: conversation.id, toolId });
    expect(saved.content.nodes[0].id).toBe('root');
    expect(saved.toolId).toBe(toolId);
  });

  it('keeps trial maps separate and binds every access to the visitor and trial session', async () => {
    const trial: MindmapOwner = { kind: 'trial', visitorId };
    const identity = { toolId, sessionId: trialId };
    await initializeMindmap(trial, { ...identity, content });
    await initializeMindmap(trial, { ...identity, toolId: 'other-map', content });
    await modifyMindmap(trial, { ...operation(), ...identity });
    expect((await readMindmap(trial, identity)).revision).toBe(1);
    expect((await readMindmap(trial, { ...identity, toolId: 'other-map' })).revision).toBe(0);
    await expect(
      readMindmap({ kind: 'trial', visitorId: 'stranger' }, identity),
    ).rejects.toMatchObject({ status: 403 });
    expect(await prisma.material.count({ where: { toolId } })).toBe(0);
  });

  it('refuses expired trial content even when the email session remains', async () => {
    const trial: MindmapOwner = { kind: 'trial', visitorId };
    const identity = { toolId, sessionId: trialId };
    await initializeMindmap(trial, { ...identity, content });
    await prisma.trialSession.update({
      where: { id: trialId },
      data: {
        createdAt: new Date(Date.now() - 31 * 86400000),
        email: 'fixture@example.invalid',
      },
    });
    await expect(readMindmap(trial, identity)).rejects.toMatchObject({ status: 403 });
    await expect(initializeMindmap(trial, { ...identity, content })).rejects.toMatchObject({
      status: 403,
    });
  });

  it('bounds receipts at 128; an evicted operation cannot apply at its stale revision', async () => {
    await initializeMindmap(owner, input());
    for (let revision = 0; revision < 130; revision++)
      await modifyMindmap(owner, {
        ...operation(revision, `op-${revision}`),
        command: 'mindmap_set_color',
        args: { node: 'root', color: revision % 2 ? 'red' : 'blue' },
      });
    const row = await prisma.material.findUniqueOrThrow({ where: { toolId } });
    expect(row.mindmapReceipts).toHaveLength(128);
    await expect(
      modifyMindmap(owner, {
        ...operation(0, 'op-0'),
        command: 'mindmap_set_color',
        args: { node: 'root', color: 'blue' },
      }),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect((await readMindmap(owner, input())).revision).toBe(130);
  });

  it('rejects legacy autosaves and patches rather than overwriting authoritative content', async () => {
    const initial = await initializeMindmap(owner, input());
    await expect(
      saveOwnedMaterial(userId, {
        toolId,
        toolType: 'mindmap',
        title: 'Stale',
        content: { title: 'Stale', nodes: [] },
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(updateOwnedMaterial(toolId, userId, { content: '{}' })).rejects.toMatchObject({
      statusCode: 409,
    });
    await expect(updateOwnedMaterial(toolId, userId, { title: 'Stale' })).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(await readMindmap(owner, input())).toEqual(initial);
  });

  it('allows metadata-only updates without changing the map revision', async () => {
    await initializeMindmap(owner, input());
    expect(await updateOwnedMaterial(toolId, userId, { isBookmarked: true })).toMatchObject({
      isBookmarked: true,
      mindmapRevision: 0,
    });
  });

  it('prevents a regenerated study kit from overwriting a versioned mindmap', async () => {
    const kitId = randomUUID();
    toolId = `sk-mindmap-${kitId}`;
    const initial = await initializeMindmap(owner, input());
    await expect(
      saveMaterialsFromStudyKit(userId, {
        id: kitId,
        title: 'New kit',
        mindmap: JSON.stringify({ title: 'Stale', nodes: [] }),
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(await readMindmap(owner, input())).toEqual(initial);
  });
});
