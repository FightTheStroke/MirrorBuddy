// ============================================================================
// USE COLLABORATION HOOK
// React hook for real-time mindmap collaboration
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import type { MindmapData, MindmapNode } from '@/lib/tools/mindmap-export';
import type { RoomParticipant } from '@/lib/collab/mindmap-room';
import { broadcastCollabEvent, type CollabSSEEvent } from '@/app/api/collab/sse/route';

// ============================================================================
// TYPES
// ============================================================================

export interface CollaborationState {
  isConnected: boolean;
  isConnecting: boolean;
  roomId: string | null;
  participants: RoomParticipant[];
  cursors: Map<string, { x: number; y: number; name: string; color: string }>;
  selections: Map<string, string>; // userId -> nodeId
  version: number;
  error: string | null;
}

export interface CollaborationActions {
  createRoom: (mindmap: MindmapData) => Promise<string | null>;
  joinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  updateCursor: (x: number, y: number) => void;
  selectNode: (nodeId: string | null) => void;
  addNode: (node: MindmapNode, parentId: string) => Promise<boolean>;
  updateNode: (nodeId: string, changes: Partial<MindmapNode>) => Promise<boolean>;
  deleteNode: (nodeId: string) => Promise<boolean>;
  moveNode: (nodeId: string, newParentId: string) => Promise<boolean>;
}

export interface UseCollaborationOptions {
  userId: string;
  userName: string;
  userAvatar?: string;
  onMindmapUpdate?: (mindmap: MindmapData) => void;
  onParticipantJoin?: (participant: RoomParticipant) => void;
  onParticipantLeave?: (userId: string) => void;
}

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
  }, [userId, userName, userAvatar]);

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
      if (onMindmapUpdate && data.mindmap) {
        onMindmapUpdate(data.mindmap);
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
  }, [userId, userName, userAvatar, onMindmapUpdate]);

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
        handleCollabEvent(data);
      } catch (error) {
        logger.warn('Failed to parse collab event', { error });
      }
    };
  }, [userId]);

  // Handle collaboration events
  const handleCollabEvent = useCallback((event: CollabSSEEvent) => {
    switch (event.type) {
      case 'user:online':
      case 'user:join': {
        const participant = event.data.user as RoomParticipant | undefined;
        if (participant && participant.id !== userId) {
          setState((prev) => ({
            ...prev,
            participants: [...prev.participants.filter((p) => p.id !== participant.id), participant],
          }));
          onParticipantJoin?.(participant);
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
          onParticipantLeave?.(leftUserId);
        }
        break;
      }

      case 'user:cursor': {
        const cursor = event.data.cursor as { x: number; y: number } | undefined;
        const participant = state.participants.find((p) => p.id === event.userId);
        if (cursor && event.userId !== userId && participant) {
          setState((prev) => {
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
        if (state.roomId) {
          refreshMindmap(state.roomId);
        }
        break;
      }

      case 'sync:full': {
        const mindmap = event.data.mindmap as MindmapData | undefined;
        const participants = event.data.participants as RoomParticipant[] | undefined;
        if (mindmap) {
          onMindmapUpdate?.(mindmap);
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
  }, [userId, state.roomId, state.participants, onMindmapUpdate, onParticipantJoin, onParticipantLeave]);

  // Refresh mindmap from server
  const refreshMindmap = useCallback(async (roomId: string) => {
    try {
      const response = await fetch(`/api/collab/rooms/${roomId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.mindmap) {
          onMindmapUpdate?.(data.mindmap);
        }
      }
    } catch (error) {
      logger.warn('Failed to refresh mindmap', { error, roomId });
    }
  }, [onMindmapUpdate]);

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
