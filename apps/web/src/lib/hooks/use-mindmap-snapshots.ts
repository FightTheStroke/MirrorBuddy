'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeMindmap, type MindmapRecoveryState } from '@/lib/mindmap/snapshot-client';
import type { MindmapSnapshot } from '@/lib/mindmap/protocol';
import { clientLogger } from '@/lib/logger/client';

interface Options {
  sessionId: string | null;
  toolId?: string | null;
  enabled?: boolean;
  onSnapshot?: (snapshot: MindmapSnapshot) => void;
}
const disconnected: MindmapRecoveryState = {
  status: 'disconnected',
  attempts: 0,
  canMutate: false,
};

/** Only the enabled active view subscribes; server snapshots never invoke edit callbacks. */
export function useMindmapSnapshots({ sessionId, toolId, enabled = true, onSnapshot }: Options) {
  const [value, setValue] = useState<{
    key: string;
    snapshot: MindmapSnapshot | null;
    recovery: MindmapRecoveryState;
  }>({ key: '', snapshot: null, recovery: disconnected });
  const subscription = useRef<ReturnType<typeof subscribeMindmap> | null>(null);
  const callback = useRef(onSnapshot);
  const key = JSON.stringify([sessionId, toolId]);
  const [selection, setSelection] = useState({ key, enabled });
  // A newly activated view cannot inherit permission to edit from an old connection.
  if (selection.key !== key || selection.enabled !== enabled) {
    setSelection({ key, enabled });
    setValue((previous) => ({ ...previous, recovery: disconnected }));
  }
  useEffect(() => {
    callback.current = onSnapshot;
  }, [onSnapshot]);
  useEffect(() => {
    if (!enabled || !sessionId || !toolId) return;
    let active = true;
    // Deferral avoids opening the discarded StrictMode subscription.
    queueMicrotask(() => {
      if (!active) return;
      try {
        subscription.current = subscribeMindmap(
          { sessionId, toolId },
          {
            onSnapshot(snapshot) {
              if (!active) return;
              setValue((previous) => ({
                key,
                snapshot,
                recovery: previous.key === key ? previous.recovery : disconnected,
              }));
              callback.current?.(snapshot);
            },
            onState(recovery) {
              if (!active) return;
              setValue((previous) => ({
                key,
                recovery,
                snapshot: previous.key === key ? previous.snapshot : null,
              }));
            },
          },
        );
      } catch (error) {
        clientLogger.error('Invalid mindmap subscription', { error: String(error) });
        setValue({
          key,
          snapshot: null,
          recovery: {
            status: 'exhausted',
            attempts: 0,
            canMutate: false,
            error: 'Invalid map identity',
          },
        });
      }
    });
    return () => {
      active = false;
      subscription.current?.stop();
      subscription.current = null;
    };
  }, [sessionId, toolId, key, enabled]);
  const reconnect = useCallback(() => subscription.current?.retry(), []);
  return {
    snapshot: value.key === key ? value.snapshot : null,
    recovery: enabled && value.key === key ? value.recovery : disconnected,
    reconnect,
  };
}
