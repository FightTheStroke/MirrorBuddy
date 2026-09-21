'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { initializeClientMap } from '@/lib/mindmap/initialize-client';
import { createMapEditor } from '@/lib/mindmap/editor-session';
import { useActiveMindmapStore, type MapEditor } from '@/lib/stores/active-mindmap-store';
import { subscribeMindmap, type MindmapRecoveryState } from '@/lib/mindmap/snapshot-client';
import { clientLogger } from '@/lib/logger/client';
import type { MindmapSnapshot } from '@/lib/mindmap/protocol';
import { useClientIdentity } from '@/lib/auth/identity-provider';
import { getClientIdentity, subscribeClientIdentity } from '@/lib/auth/client-auth';

const retained = new Map<string, MapEditor>();
let retainedOwner: string | null = null;
const initial: MindmapRecoveryState = { status: 'connecting', canMutate: false, attempts: 0 };
interface Options {
  toolId: string;
  sessionId: string | null;
  content: unknown;
  enabled: boolean;
  focus: (id: string) => void;
}
export function useMindmapEditor({ toolId, sessionId, content, enabled, focus }: Options) {
  const identity = useClientIdentity();
  const principal =
    identity.status === 'authenticated'
      ? identity.userId
      : identity.status === 'anonymous'
        ? 'trial'
        : null;
  const originalPrincipal = useRef<string | null>(null);
  const allowed =
    enabled &&
    principal !== null &&
    (originalPrincipal.current === null || originalPrincipal.current === principal);
  const [editor, setEditor] = useState<MapEditor | null>(null);
  const [recovery, setRecovery] = useState(initial);
  const [, changed] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [visible, setVisible] = useState(true);
  const lease = useRef(Symbol('mindmap-view')).current;
  const latest = useRef({ content, focus });
  useEffect(() => {
    latest.current = { content, focus };
  }, [content, focus]);
  const active = useActiveMindmapStore((state) => state.active?.lease === lease);
  const stream = useRef<ReturnType<typeof subscribeMindmap> | null>(null);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== 'hidden');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (!allowed || !principal) return;
    originalPrincipal.current ??= principal;
    setEditor(null);
    setRecovery(initial);
    useActiveMindmapStore.getState().reserve(lease);
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 10_000);
    let current = true;
    let owned: MapEditor | null = null;
    let key = '';
    void initializeClientMap(toolId, sessionId, latest.current.content, abort.signal, principal)
      .then(({ owner, snapshot }) => {
        if (!current) return;
        if (retainedOwner !== owner) {
          retained.clear();
          retainedOwner = owner;
        }
        key = JSON.stringify([owner, snapshot.sessionId, toolId]);
        owned = retained.get(key) ?? createMapEditor(snapshot, () => {});
        retained.delete(key);
        owned.listen(() => {
          if (current) changed((value) => value + 1);
        });
        owned.accept(snapshot);
        setEditor(owned);
        useActiveMindmapStore
          .getState()
          .claim({ lease, editor: owned, focus: (id) => latest.current.focus(id) });
      })
      .catch((error: unknown) => {
        if (!current) return;
        clientLogger.warn('Mindmap initialization failed', { error: String(error) });
        setRecovery({ status: 'exhausted', canMutate: false, attempts: 0, error: String(error) });
      })
      .finally(() => clearTimeout(timeout));
    const unsubscribe = subscribeClientIdentity(() => {
      if (getClientIdentity() === identity) return;
      owned?.ready(false);
      stream.current?.stop();
      useActiveMindmapStore.getState().release(lease);
    });
    return () => {
      unsubscribe();
      current = false;
      abort.abort();
      clearTimeout(timeout);
      useActiveMindmapStore.getState().release(lease);
      if (owned) {
        owned.ready(false);
        const next = getClientIdentity();
        const sameOwner =
          next.status === 'pending' ||
          next.status === 'unavailable' ||
          (next.status === 'authenticated' ? next.userId === principal : principal === 'trial');
        const pendingEditor = owned;
        owned.listen(() => {
          if (!pendingEditor.state().pending) retained.delete(key);
        });
        if (sameOwner && owned.state().pending) retained.set(key, owned);
        else retained.delete(key);
      }
    };
  }, [toolId, sessionId, allowed, principal, identity, attempt, lease]);
  useEffect(() => {
    if (!editor || !active || !allowed || !visible) return;
    const identity = editor.state().snapshot;
    if (!identity) return;
    const subscription = subscribeMindmap(identity, {
      onSnapshot: (snapshot: MindmapSnapshot) => editor.accept(snapshot),
      onState: (state) => {
        editor.ready(state.canMutate);
        setRecovery(state);
      },
    });
    stream.current = subscription;
    return () => {
      subscription.stop();
      stream.current = null;
      editor.ready(false);
    };
  }, [editor, active, allowed, visible]);
  const retry = useCallback(() => {
    if (editor && stream.current) {
      if (editor.state().pending && recovery.canMutate) void editor.retry();
      else stream.current.retry();
    } else {
      setRecovery(initial);
      setAttempt((value) => value + 1);
    }
  }, [editor, recovery.canMutate]);
  const activate = useCallback(() => useActiveMindmapStore.getState().activate(lease), [lease]);
  return {
    editor: allowed ? editor : null,
    state: allowed ? editor?.state() : undefined,
    recovery,
    retry,
    activate,
    active: active && allowed && visible,
  };
}
