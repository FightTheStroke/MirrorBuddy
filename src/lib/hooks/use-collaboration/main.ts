/**
 * useCollaboration hook
 * Main hook that orchestrates real-time mindmap collaboration
 * Combines room management, event handling, presence, and node operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import type { MindmapData, MindmapNode } from '@/lib/tools/mindmap-export';
import type { CollabSSEEvent } from '@/app/api/collab/sse/route';
import type { CollaborationState, CollaborationActions, UseCollaborationOptions } from './types';
import { createEventHandler } from './event-handler';
import { useCursorUpdater, useNodeSelector } from './presence';
import { createCollabRoom, joinCollabRoom, leaveCollabRoom } from './room-operations';
import { addNodeToRoom, updateNodeInRoom, deleteNodeFromRoom, moveNodeInRoom } from './node-operations';
import { refreshMindmapFromServer, setupSSEConnection } from './utils';

/**
 * Main collaboration hook
 * Manages real-time collaboration for mindmaps
 */
export function useCollaboration(
  options: UseCollaborationOptions
): [CollaborationState, CollaborationActions] {
  const { userId, userName, userAvatar = '', onMindmapUpdate, onParticipantJoin, onParticipantLeave } =
    options;

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

  // Refs for callbacks to avoid stale closures
  const onMindmapUpdateRef = useRef(onMindmapUpdate);
  const onParticipantJoinRef = useRef(onParticipantJoin);
  const onParticipantLeaveRef = useRef(onParticipantLeave);
  useEffect(() => {
    onMindmapUpdateRef.current = onMindmapUpdate;
    onParticipantJoinRef.current = onParticipantJoin;
    onParticipantLeaveRef.current = onParticipantLeave;
  }, [onMindmapUpdate, onParticipantJoin, onParticipantLeave]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const refreshMindmap = useCallback(
    async (roomId: string) => {
      await refreshMindmapFromServer(roomId, onMindmapUpdateRef.current);
    },
    []
  );

  const eventHandler = useCallback(
    (event: CollabSSEEvent, roomId: string) => {
      createEventHandler(
        setState,
        userId,
        refreshMindmap,
        onMindmapUpdateRef.current,
        onParticipantJoinRef.current,
        onParticipantLeaveRef.current
      )(event, roomId);
    },
    [userId, refreshMindmap]
  );

  const connectToRoom = useCallback(
    async (roomId: string) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      eventSourceRef.current = setupSSEConnection(roomId, userId, eventHandler, setState);
    },
    [userId, eventHandler]
  );

  const createRoom = useCallback(
    async (mindmap: MindmapData): Promise<string | null> => {
      setState((prev) => ({ ...prev, isConnecting: true, error: null }));

      try {
        const result = await createCollabRoom(mindmap, userId, userName, userAvatar);
        if (!result) {
          setState((prev) => ({
            ...prev,
            isConnecting: false,
            error: 'Failed to create room',
          }));
          return null;
        }
        await connectToRoom(result.roomId);
        return result.roomId;
      } catch (error) {
        logger.error('Failed to create collaboration room', undefined, error);
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: error instanceof Error ? error.message : 'Failed to create room',
        }));
        return null;
      }
    },
    [userId, userName, userAvatar, connectToRoom]
  );

  // Join room
  const joinRoom = useCallback(
    async (roomId: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, isConnecting: true, error: null }));

      try {
        const result = await joinCollabRoom(roomId, userId, userName, userAvatar);
        if (!result) {
          setState((prev) => ({
            ...prev,
            isConnecting: false,
            error: 'Failed to join room',
          }));
          return false;
        }
        setState((prev) => ({
          ...prev,
          participants: result.participants || [],
          version: 0,
        }));
        if (result.mindmap) {
          onMindmapUpdateRef.current?.(result.mindmap);
        }
        await connectToRoom(roomId);
        return true;
      } catch (error) {
        logger.error('Failed to join collaboration room', { roomId }, error);
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: error instanceof Error ? error.message : 'Failed to join room',
        }));
        return false;
      }
    },
    [userId, userName, userAvatar, connectToRoom]
  );

  const leaveRoom = useCallback(async () => {
    if (!state.roomId) return;
    try {
      await leaveCollabRoom(state.roomId, userId);
    } catch (error) {
      logger.warn('Failed to leave room cleanly', { error });
    }
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

  const updateCursor = useCursorUpdater(setState, userId);
  const selectNode = useNodeSelector(setState, userId);

  const addNode = useCallback(
    async (node: MindmapNode, parentId: string): Promise<boolean> => {
      if (!state.roomId) return false;
      return addNodeToRoom(state.roomId, userId, node, parentId);
    },
    [state.roomId, userId]
  );

  const updateNode = useCallback(
    async (nodeId: string, changes: Partial<MindmapNode>): Promise<boolean> => {
      if (!state.roomId) return false;
      return updateNodeInRoom(state.roomId, userId, nodeId, changes);
    },
    [state.roomId, userId]
  );

  const deleteNode = useCallback(
    async (nodeId: string): Promise<boolean> => {
      if (!state.roomId) return false;
      return deleteNodeFromRoom(state.roomId, userId, nodeId);
    },
    [state.roomId, userId]
  );

  const moveNode = useCallback(
    async (nodeId: string, newParentId: string): Promise<boolean> => {
      if (!state.roomId) return false;
      return moveNodeInRoom(state.roomId, userId, nodeId, newParentId);
    },
    [state.roomId, userId]
  );

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
