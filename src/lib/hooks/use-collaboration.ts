// ============================================================================
// USE COLLABORATION HOOK
// React hook for real-time mindmap collaboration
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import type { MindmapData, MindmapNode } from '@/lib/tools/mindmap-export';
import type { RoomParticipant } from '@/lib/collab/mindmap-room';
import type { CollabSSEEvent } from '@/app/api/collab/sse/route';
import type {
  CollaborationState,
  CollaborationActions,
  UseCollaborationOptions,
} from './use-collaboration/types';

export type {
  CollaborationState,
  CollaborationActions,
  UseCollaborationOptions,
} from './use-collaboration/types';

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useCollaboration(options: UseCollaborationOptions): [CollaborationState, CollaborationActions] {
  const { userId, userName, userAvatar = '', onMindmapUpdate, onParticipantJoin, onParticipantLeave } = options;

  const [state, setState] = useState<CollaborationState>({
    isConnected: false,
    isConnecting: false,
    roomId: null,
    participants: [],
    cursors: new Map(),
    selections: new Map(),
    version: 0,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);

  // Refs for callbacks to avoid stale closures
  const onMindmapUpdateRef = useRef(onMindmapUpdate);
  const onParticipantJoinRef = useRef(onParticipantJoin);
  const onParticipantLeaveRef = useRef(onParticipantLeave);

  // Keep refs updated
  useEffect(() => {
    onMindmapUpdateRef.current = onMindmapUpdate;
    onParticipantJoinRef.current = onParticipantJoin;
    onParticipantLeaveRef.current = onParticipantLeave;
  }, [onMindmapUpdate, onParticipantJoin, onParticipantLeave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current);
      }
    };
  }, []);

  // Refresh mindmap from server
  const refreshMindmap = useCallback(async (roomId: string) => {
    try {
      const response = await fetch(`/api/collab/rooms/${roomId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.mindmap) {
          onMindmapUpdateRef.current?.(data.mindmap);
        }
      }
    } catch (error) {
      logger.warn('Failed to refresh mindmap', { error, roomId });
    }
  }, []);

  // Handle collaboration events
  const handleCollabEvent = useCallback((event: CollabSSEEvent, roomId: string, _participantsSnapshot: RoomParticipant[]) => {
    switch (event.type) {
      case 'user:online':
      case 'user:join': {
        const participant = event.data.user as RoomParticipant | undefined;
        if (participant && participant.id !== userId) {
          setState((prev) => ({
            ...prev,
            participants: [...prev.participants.filter((p) => p.id !== participant.id), participant],
          }));
          onParticipantJoinRef.current?.(participant);
        }
        break;
      }

      case 'user:offline':
      case 'user:leave': {
        const leftUserId = event.userId;
        if (leftUserId !== userId) {
          setState((prev) => ({
            ...prev,
            participants: prev.participants.filter((p) => p.id !== leftUserId),
            cursors: new Map([...prev.cursors].filter(([id]) => id !== leftUserId)),
            selections: new Map([...prev.selections].filter(([id]) => id !== leftUserId)),
          }));
          onParticipantLeaveRef.current?.(leftUserId);
        }
        break;
      }

      case 'user:cursor': {
        const cursor = event.data.cursor as { x: number; y: number } | undefined;
        if (cursor && event.userId !== userId) {
          setState((prev) => {
            const participant = prev.participants.find((p) => p.id === event.userId);
            if (!participant) return prev;
            const newCursors = new Map(prev.cursors);
            newCursors.set(event.userId, {
              x: cursor.x,
              y: cursor.y,
              name: participant.name,
              color: participant.color,
            });
            return { ...prev, cursors: newCursors };
          });
        }
        break;
      }

      case 'user:select': {
        const nodeId = event.data.nodeId as string | undefined;
        if (event.userId !== userId) {
          setState((prev) => {
            const newSelections = new Map(prev.selections);
            if (nodeId) {
              newSelections.set(event.userId, nodeId);
            } else {
              newSelections.delete(event.userId);
            }
            return { ...prev, selections: newSelections };
          });
        }
        break;
      }

      case 'node:add':
      case 'node:update':
      case 'node:delete':
      case 'node:move': {
        // Refresh mindmap state
        if (event.version) {
          setState((prev) => ({ ...prev, version: event.version! }));
        }
        // Trigger refresh via callback
        if (roomId) {
          refreshMindmap(roomId);
        }
        break;
      }

      case 'sync:full': {
        const mindmap = event.data.mindmap as MindmapData | undefined;
        const participants = event.data.participants as RoomParticipant[] | undefined;
        if (mindmap) {
          onMindmapUpdateRef.current?.(mindmap);
        }
        if (participants) {
          setState((prev) => ({
            ...prev,
            participants: participants.filter((p) => p.id !== userId),
            version: event.version || prev.version,
          }));
        }
        break;
      }
    }
  }, [userId, refreshMindmap]);

  // Connect to SSE
  const connectToRoom = useCallback(async (roomId: string) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/collab/sse?roomId=${roomId}&userId=${userId}`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setState((prev) => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        roomId,
      }));
      logger.info('Connected to collaboration room', { roomId });
    };

    es.onerror = (error) => {
      logger.error('Collaboration SSE error', { error, roomId });
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: 'Connection lost',
      }));
    };

    es.onmessage = (event) => {
      try {
        const data: CollabSSEEvent = JSON.parse(event.data);
        // Get current state for participants snapshot
        setState((prev) => {
          handleCollabEvent(data, roomId, prev.participants);
          return prev; // No state change here, handleCollabEvent does it
        });
      } catch (error) {
        logger.warn('Failed to parse collab event', { error });
      }
    };
  }, [userId, handleCollabEvent]);

  // Create room
  const createRoom = useCallback(async (mindmap: MindmapData): Promise<string | null> => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const response = await fetch('/api/collab/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mindmap,
          user: { id: userId, name: userName, avatar: userAvatar },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create room');
      }

      const data = await response.json();
      const roomId = data.room.roomId;

      // Connect to SSE
      await connectToRoom(roomId);

      return roomId;
    } catch (error) {
      logger.error('Failed to create collaboration room', { error });
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to create room',
      }));
      return null;
    }
  }, [userId, userName, userAvatar, connectToRoom]);

  // Join room
  const joinRoom = useCallback(async (roomId: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const response = await fetch(`/api/collab/rooms/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          user: { id: userId, name: userName, avatar: userAvatar },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to join room');
      }

      const data = await response.json();

      // Update state with room data
      setState((prev) => ({
        ...prev,
        participants: data.participants || [],
        version: data.version || 0,
      }));

      // Notify about mindmap
      if (data.mindmap) {
        onMindmapUpdateRef.current?.(data.mindmap);
      }

      // Connect to SSE
      await connectToRoom(roomId);

      return true;
    } catch (error) {
      logger.error('Failed to join collaboration room', { error, roomId });
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to join room',
      }));
      return false;
    }
  }, [userId, userName, userAvatar, connectToRoom]);

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (!state.roomId) return;

    try {
      await fetch(`/api/collab/rooms/${state.roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          user: { id: userId },
        }),
      });
    } catch (error) {
      logger.warn('Failed to leave room cleanly', { error });
    }

    // Close SSE
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState({
      isConnected: false,
      isConnecting: false,
      roomId: null,
      participants: [],
      cursors: new Map(),
      selections: new Map(),
      version: 0,
      error: null,
    });
  }, [state.roomId, userId]);

  // Update cursor (throttled)
  const updateCursor = useCallback((x: number, y: number) => {
    lastCursorRef.current = { x, y };

    if (cursorThrottleRef.current) return;

    cursorThrottleRef.current = setTimeout(() => {
      cursorThrottleRef.current = null;
      if (!state.roomId || !lastCursorRef.current) return;

      // Broadcast cursor via API (since we can't call broadcastCollabEvent from client)
      fetch(`/api/collab/rooms/${state.roomId}/cursor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          cursor: lastCursorRef.current,
        }),
      }).catch(() => {
        // Ignore cursor broadcast errors
      });
    }, 50); // 20 FPS max for cursor updates
  }, [state.roomId, userId]);

  // Select node
  const selectNode = useCallback((nodeId: string | null) => {
    if (!state.roomId) return;

    fetch(`/api/collab/rooms/${state.roomId}/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        nodeId,
      }),
    }).catch(() => {
      // Ignore selection broadcast errors
    });
  }, [state.roomId, userId]);

  // Node operations
  const addNode = useCallback(async (node: MindmapNode, parentId: string): Promise<boolean> => {
    if (!state.roomId) return false;

    try {
      const response = await fetch(`/api/collab/rooms/${state.roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_node',
          user: { id: userId },
          node,
          parentId,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }, [state.roomId, userId]);

  const updateNode = useCallback(async (nodeId: string, changes: Partial<MindmapNode>): Promise<boolean> => {
    if (!state.roomId) return false;

    try {
      const response = await fetch(`/api/collab/rooms/${state.roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_node',
          user: { id: userId },
          nodeId,
          changes,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }, [state.roomId, userId]);

  const deleteNode = useCallback(async (nodeId: string): Promise<boolean> => {
    if (!state.roomId) return false;

    try {
      const response = await fetch(`/api/collab/rooms/${state.roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_node',
          user: { id: userId },
          nodeId,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }, [state.roomId, userId]);

  const moveNode = useCallback(async (nodeId: string, newParentId: string): Promise<boolean> => {
    if (!state.roomId) return false;

    try {
      const response = await fetch(`/api/collab/rooms/${state.roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move_node',
          user: { id: userId },
          nodeId,
          newParentId,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }, [state.roomId, userId]);

  const actions: CollaborationActions = {
    createRoom,
    joinRoom,
    leaveRoom,
    updateCursor,
    selectNode,
    addNode,
    updateNode,
    deleteNode,
    moveNode,
  };

  return [state, actions];
}
