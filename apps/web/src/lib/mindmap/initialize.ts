import 'server-only';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { generateSearchableText } from '@/lib/search/searchable-text';
import { MindmapError, identitySchema, type MindmapSnapshot } from './protocol';
import { normalizeMindmap } from './normalize';
import {
  ownerSchema,
  readMapState,
  readTrial,
  trialCutoff,
  parseStoredMindmap,
  type MindmapOwner,
  type MindmapDatabase,
  type MapIdentity,
} from './storage';

const initializeSchema = identitySchema.extend({ content: z.unknown().optional() });
const snapshot = (map: MindmapSnapshot): MindmapSnapshot => ({
  toolId: map.toolId,
  sessionId: map.sessionId,
  revision: map.revision,
  content: map.content,
});

async function initializeTrial(
  owner: Extract<MindmapOwner, { kind: 'trial' }>,
  identity: MapIdentity,
  content: unknown,
  db: MindmapDatabase,
): Promise<MindmapSnapshot> {
  const trial = await readTrial(owner.visitorId, identity.sessionId, db);
  if (Object.hasOwn(trial.maps, identity.toolId)) {
    return snapshot((await readMapState(owner, identity, db)).map);
  }
  const next = { ...identity, revision: 0, content: normalizeMindmap(content), receipts: [] };
  const result = await db.trialSession.updateMany({
    where: {
      id: identity.sessionId,
      visitorId: owner.visitorId,
      mindmapRevision: trial.revision,
      createdAt: { gt: trialCutoff() },
    },
    data: {
      mindmaps: { ...trial.maps, [identity.toolId]: next },
      mindmapRevision: { increment: 1 },
    },
  });
  if (result.count !== 1) {
    const latest = await readTrial(owner.visitorId, identity.sessionId, db);
    if (!Object.hasOwn(latest.maps, identity.toolId))
      throw new MindmapError('REVISION_CONFLICT', 409);
    return snapshot((await readMapState(owner, identity, db)).map);
  }
  return snapshot(next);
}

export async function initializeMindmap(
  principal: MindmapOwner,
  input: unknown,
  db: MindmapDatabase = prisma,
): Promise<MindmapSnapshot> {
  const owner = ownerSchema.parse(principal);
  const parsed = initializeSchema.parse(input);
  const { content, ...identity } = parsed;
  if (owner.kind === 'trial') return initializeTrial(owner, identity, content, db);
  const existing = await db.material.findUnique({ where: { toolId: identity.toolId } });
  if (existing) {
    if (
      existing.userId !== owner.userId ||
      existing.toolType !== 'mindmap' ||
      existing.status !== 'active'
    )
      throw new MindmapError('MAP_ACCESS_DENIED', 403);
    if (existing.mindmapRevision !== null)
      return snapshot((await readMapState(owner, identity, db)).map);
    // Migrate only the stored content, never the potentially stale browser copy.
    const canonical = parseStoredMindmap(() =>
      normalizeMindmap(JSON.parse(existing.content), existing.title),
    );
    const updated = await db.material.updateMany({
      where: {
        toolId: identity.toolId,
        userId: owner.userId,
        toolType: 'mindmap',
        status: 'active',
        mindmapRevision: null,
        content: existing.content,
      },
      data: {
        content: JSON.stringify(canonical),
        title: canonical.title,
        searchableText: generateSearchableText('mindmap', canonical),
        mindmapRevision: 0,
        mindmapSourceSession: identity.sessionId,
        mindmapReceipts: [],
      },
    });
    if (updated.count !== 1) {
      const current = await db.material.findUnique({ where: { toolId: identity.toolId } });
      if (current?.mindmapRevision === null) throw new MindmapError('REVISION_CONFLICT', 409);
    }
    return snapshot((await readMapState(owner, identity, db)).map);
  }
  const outputs = await db.toolOutput.findMany({
    where: { toolId: identity.toolId, toolType: 'mindmap' },
    select: { data: true, conversationId: true, conversation: { select: { userId: true } } },
    take: 2,
  });
  if (outputs.some((output) => output.conversation.userId !== owner.userId))
    throw new MindmapError('MAP_ACCESS_DENIED', 403);
  if (outputs.length > 1) throw new MindmapError('AMBIGUOUS_TOOL_SOURCE', 409);
  const output = outputs[0];
  if (output && output.conversationId !== identity.sessionId)
    throw new MindmapError('MAP_ACCESS_DENIED', 403);
  const canonical = output
    ? parseStoredMindmap(() => normalizeMindmap(JSON.parse(output.data)))
    : normalizeMindmap(content);
  // skipDuplicates makes initialization idempotent across processes, without an upsert overwrite.
  await db.material.createMany({
    data: {
      userId: owner.userId,
      toolId: identity.toolId,
      toolType: 'mindmap',
      title: canonical.title,
      content: JSON.stringify(canonical),
      searchableText: generateSearchableText('mindmap', canonical),
      mindmapRevision: 0,
      mindmapSourceSession: identity.sessionId,
      mindmapReceipts: [],
    },
    skipDuplicates: true,
  });
  return snapshot((await readMapState(owner, identity, db)).map);
}
