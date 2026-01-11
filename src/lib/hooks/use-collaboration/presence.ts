/**
 * Presence operations: cursor and node selection tracking
 * Broadcasts user cursor position and selected node to other participants
 */

import { useRef, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CollaborationState } from './types';

/**
 * Hook for cursor update function with throttling
 * Limits cursor broadcasts to 20 FPS (50ms throttle)
 */
export function useCursorUpdater(
  setState: Dispatch<SetStateAction<CollaborationState>>,
  userId: string
) {
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);

  return useCallback((x: number, y: number) => {
    lastCursorRef.current = { x, y };
    if (cursorThrottleRef.current) return;
    cursorThrottleRef.current = setTimeout(() => {
      cursorThrottleRef.current = null;
      let roomId: string | null = null;
      setState((prev) => {
        roomId = prev.roomId;
        return prev;
      });
      if (!roomId || !lastCursorRef.current) return;
      fetch(`/api/collab/rooms/${roomId}/cursor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cursor: lastCursorRef.current }),
      }).catch(() => {});
    }, 50);
  }, [userId, setState]);
}

/**
 * Hook for node selection updater
 * Broadcasts selected node to other participants
 */
export function useNodeSelector(
  setState: Dispatch<SetStateAction<CollaborationState>>,
  userId: string
) {
  return useCallback((nodeId: string | null) => {
    let roomId: string | null = null;
    setState((prev) => {
      roomId = prev.roomId;
      return prev;
    });
    if (!roomId) return;
    fetch(`/api/collab/rooms/${roomId}/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, nodeId }),
    }).catch(() => {});
  }, [userId, setState]);
}
