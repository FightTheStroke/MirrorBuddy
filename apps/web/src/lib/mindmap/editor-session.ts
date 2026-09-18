'use client';
import { csrfFetch } from '@/lib/auth';
import { clientLogger } from '@/lib/logger/client';
import {
  contentSchema,
  outcomeSchema,
  type MindmapContent,
  type MindmapSnapshot,
} from './protocol';
import type { VoiceToolCallResult } from '@/lib/voice/voice-tool-commands/types';
import { z } from 'zod';

type Identity = { toolId: string; sessionId: string };
interface Pending {
  command: Identity & {
    operationId: string;
    baseRevision: number;
    command: string;
    args: Record<string, unknown>;
  };
  before: MindmapContent;
  undo: boolean;
}
export interface EditorState {
  snapshot: MindmapSnapshot | null;
  pending: Pending | null;
  canMutate: boolean;
  canUndo: boolean;
  error: string | null;
  busy: boolean;
}
const responseSchema = outcomeSchema.extend({
  focus: z.object({ nodeId: z.string(), label: z.string() }).optional(),
});

/** A pending envelope survives reconnection; only its receipt resolves ambiguous delivery. */
export function createMapEditor({ toolId, sessionId }: Identity, changed: () => void) {
  const identity = { toolId, sessionId };
  let snapshot: MindmapSnapshot | null = null;
  let pending: Pending | null = null;
  let history: MindmapContent[] = [];
  let connected = false;
  let busy = false;
  let error: string | null = null;
  let acknowledgedRevision = -1;
  const canMutate = () =>
    connected && !!snapshot && !pending && !busy && snapshot.revision >= acknowledgedRevision;
  const state = (): EditorState => ({
    snapshot,
    pending,
    error,
    busy,
    canMutate: canMutate(),
    canUndo: canMutate() && history.length > 0,
  });
  async function deliver(): Promise<VoiceToolCallResult> {
    if (!pending || busy || !connected) return { success: false, error: 'map_unavailable' };
    const intent = pending;
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 10_000);
    busy = true;
    error = null;
    changed();
    try {
      const response = await csrfFetch('/api/tools/stream/modify', {
        method: 'POST',
        signal: abort.signal,
        body: JSON.stringify(intent.command),
      });
      if (!response.ok) {
        const body = z.object({ error: z.string() }).parse(await response.json());
        throw new Error(body.error);
      }
      const result = responseSchema.parse(await response.json());
      if (result.toolId !== identity.toolId || result.operationId !== intent.command.operationId)
        throw new Error('Mindmap response identity mismatch');
      if (!result.focus) {
        history =
          snapshot && snapshot.revision > result.revision
            ? []
            : intent.undo
              ? history.slice(0, -1)
              : [...history.slice(-19), intent.before];
        acknowledgedRevision = Math.max(acknowledgedRevision, result.revision);
      }
      pending = null;
      return { success: true, ...result, sessionId: identity.sessionId, toolType: 'mindmap' };
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Mindmap command failed';
      clientLogger.warn('Mindmap intent retained after failed delivery', { error });
      return { success: false, error, toolType: 'mindmap' };
    } finally {
      clearTimeout(timeout);
      busy = false;
      changed();
    }
  }
  const command = async (
    name: string,
    args: Record<string, unknown>,
    operationId = crypto.randomUUID(),
    undo = false,
  ) => {
    if (!canMutate() || !snapshot) return { success: false, error: 'map_unavailable' };
    pending = {
      command: { ...identity, operationId, baseRevision: snapshot.revision, command: name, args },
      before: snapshot.content,
      undo,
    };
    return deliver();
  };
  return {
    state,
    listen(callback: () => void) {
      changed = callback;
    },
    accept(next: MindmapSnapshot) {
      if (
        next.toolId !== identity.toolId ||
        next.sessionId !== identity.sessionId ||
        (snapshot && next.revision <= snapshot.revision)
      )
        return;
      if (!pending && next.revision > acknowledgedRevision) history = [];
      snapshot = next;
      changed();
    },
    ready(value: boolean) {
      if (connected !== value) {
        connected = value;
        changed();
      }
    },
    command,
    replace(content: MindmapContent) {
      return command('mindmap_replace', { content: contentSchema.parse(content) });
    },
    undo() {
      const previous = history.at(-1);
      return previous
        ? command('mindmap_replace', { content: previous }, undefined, true)
        : Promise.resolve({ success: false, error: 'undo_unavailable' });
    },
    retry: deliver,
  };
}
