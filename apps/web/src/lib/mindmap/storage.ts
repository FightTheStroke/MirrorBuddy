import 'server-only';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';
import { generateSearchableText } from '@/lib/search/searchable-text';
import {
  MindmapError,
  receiptsSchema,
  snapshotSchema,
  type MindmapReceipt,
  type MindmapSnapshot,
} from './protocol';

export const ownerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('user'), userId: z.string().min(1) }),
  z.object({ kind: z.literal('trial'), visitorId: z.string().min(1) }),
]);
export type MindmapOwner = z.infer<typeof ownerSchema>;
export type MindmapDatabase = Pick<PrismaClient, 'material' | 'trialSession' | 'toolOutput'>;
export const storedMapSchema = snapshotSchema.extend({ receipts: receiptsSchema });
export const trialMapsSchema = z.record(z.string(), storedMapSchema);
export type StoredMap = z.infer<typeof storedMapSchema>;
export type MapIdentity = { sessionId: string; toolId: string };
export type MapState = {
  map: StoredMap;
  rowRevision: number;
  trialMaps?: Record<string, StoredMap>;
};

export const trialCutoff = () => new Date(Date.now() - 30 * 86400000);

/** Storage corruption is a server fault, not a malformed caller command. */
export function parseStoredMindmap<T>(parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    throw new Error('Corrupt stored mindmap', { cause: error });
  }
}

export async function readTrial(
  visitorId: string,
  sessionId: string,
  db: MindmapDatabase = prisma,
) {
  const row = await db.trialSession.findFirst({
    where: { id: sessionId, visitorId, createdAt: { gt: trialCutoff() } },
    select: { mindmaps: true, mindmapRevision: true },
  });
  if (!row) throw new MindmapError('MAP_ACCESS_DENIED', 403);
  return {
    maps: parseStoredMindmap(() => trialMapsSchema.parse(row.mindmaps)),
    revision: row.mindmapRevision,
  };
}

export async function readMapState(
  owner: MindmapOwner,
  identity: MapIdentity,
  db: MindmapDatabase = prisma,
): Promise<MapState> {
  if (owner.kind === 'trial') {
    const trial = await readTrial(owner.visitorId, identity.sessionId, db);
    const map = Object.hasOwn(trial.maps, identity.toolId)
      ? trial.maps[identity.toolId]
      : undefined;
    if (!map) throw new MindmapError('MAP_NOT_FOUND', 404);
    if (map.toolId !== identity.toolId || map.sessionId !== identity.sessionId)
      throw new Error('Corrupt trial mindmap identity');
    return { map, rowRevision: trial.revision, trialMaps: trial.maps };
  }
  const row = await db.material.findFirst({
    where: { toolId: identity.toolId, userId: owner.userId, toolType: 'mindmap', status: 'active' },
    select: {
      content: true,
      mindmapRevision: true,
      mindmapSourceSession: true,
      mindmapReceipts: true,
    },
  });
  if (!row) throw new MindmapError('MAP_ACCESS_DENIED', 403);
  if (row.mindmapRevision === null) throw new MindmapError('MAP_NOT_INITIALIZED', 409);
  if (row.mindmapSourceSession !== identity.sessionId)
    throw new MindmapError('MAP_ACCESS_DENIED', 403);
  const map = parseStoredMindmap(() =>
    storedMapSchema.parse({
      ...identity,
      revision: row.mindmapRevision,
      content: JSON.parse(row.content),
      receipts: row.mindmapReceipts,
    }),
  );
  return { map, rowRevision: row.mindmapRevision };
}

/** Content, version and deduplication receipt are changed in one conditional statement. */
export async function writeMapState(
  owner: MindmapOwner,
  previous: MapState,
  next: MindmapSnapshot,
  receipts: MindmapReceipt[],
  db: MindmapDatabase = prisma,
): Promise<boolean> {
  if (owner.kind === 'trial') {
    if (!previous.trialMaps) throw new Error('Trial map state required');
    const result = await db.trialSession.updateMany({
      where: {
        id: next.sessionId,
        visitorId: owner.visitorId,
        mindmapRevision: previous.rowRevision,
        createdAt: { gt: trialCutoff() },
      },
      data: {
        mindmaps: { ...previous.trialMaps, [next.toolId]: { ...next, receipts } },
        mindmapRevision: { increment: 1 },
      },
    });
    return result.count === 1;
  }
  const result = await db.material.updateMany({
    where: {
      toolId: next.toolId,
      userId: owner.userId,
      toolType: 'mindmap',
      status: 'active',
      mindmapRevision: previous.rowRevision,
      mindmapSourceSession: next.sessionId,
    },
    data: {
      content: JSON.stringify(next.content),
      title: next.content.title,
      searchableText: generateSearchableText('mindmap', next.content),
      mindmapRevision: next.revision,
      mindmapReceipts: receipts,
    },
  });
  return result.count === 1;
}
