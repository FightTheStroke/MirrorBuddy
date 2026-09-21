import 'server-only';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db';
import {
  MindmapError,
  commandSchema,
  identitySchema,
  outcomeSchema,
  type MindmapOutcome,
  type MindmapReceipt,
  type MindmapSnapshot,
} from './protocol';
import { applyMindmapCommand } from './tree';
import {
  ownerSchema,
  readMapState,
  writeMapState,
  type MindmapDatabase,
  type MindmapOwner,
} from './storage';
export { initializeMindmap } from './initialize';

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new MindmapError('INVALID_OPERATION', 400);
  return encoded;
}

function priorOutcome(
  receipts: MindmapReceipt[],
  operationId: string,
  fingerprint: string,
): MindmapOutcome | undefined {
  const prior = receipts.find((receipt) => receipt.operationId === operationId);
  if (!prior) return undefined;
  if (prior.fingerprint !== fingerprint) throw new MindmapError('OPERATION_ID_REUSED', 409);
  return outcomeSchema.parse(prior);
}

export async function readMindmap(
  principal: MindmapOwner,
  input: unknown,
  db: MindmapDatabase = prisma,
): Promise<MindmapSnapshot> {
  const owner = ownerSchema.parse(principal);
  const identity = identitySchema.parse(input);
  const { map } = await readMapState(owner, identity, db);
  return { ...identity, revision: map.revision, content: map.content };
}

export async function modifyMindmap(
  principal: MindmapOwner,
  input: unknown,
  db: MindmapDatabase = prisma,
): Promise<MindmapOutcome> {
  const owner = ownerSchema.parse(principal);
  const command = commandSchema.parse(input);
  const fingerprint = createHash('sha256').update(canonicalJson(command)).digest('hex');
  const previous = await readMapState(owner, command, db);
  const prior = priorOutcome(previous.map.receipts, command.operationId, fingerprint);
  if (prior) return prior;
  if (previous.map.revision !== command.baseRevision)
    throw new MindmapError('REVISION_CONFLICT', 409);
  const next: MindmapSnapshot = {
    sessionId: command.sessionId,
    toolId: command.toolId,
    revision: command.baseRevision + 1,
    content: applyMindmapCommand(previous.map.content, command),
  };
  const outcome: MindmapOutcome = {
    toolId: command.toolId,
    operationId: command.operationId,
    revision: next.revision,
  };
  const receipts = [...previous.map.receipts, { ...outcome, fingerprint }].slice(-128);
  if (await writeMapState(owner, previous, next, receipts, db)) return outcome;
  // A concurrent delivery may have committed this exact command. Never retry it with a new version.
  const latest = await readMapState(owner, command, db);
  const committed = priorOutcome(latest.map.receipts, command.operationId, fingerprint);
  if (committed) return committed;
  throw new MindmapError('REVISION_CONFLICT', 409);
}
