/**
 * @file node-handlers.ts
 * @brief Node operation handlers
 */

import type { MindmapNode } from '@/lib/tools/mindmap-export';
import { addNode, updateNode, deleteNode, moveNode, getRoomState } from '../mindmap-room';
import { connections } from './connection-manager';
import { sendToConnection, broadcastToRoom } from './messaging-utils';

export function handleNodeAdd(
  connectionId: string,
  data: { node: MindmapNode; parentId: string }
): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const result = addNode(
    connection.roomId,
    connection.userId,
    data.node,
    data.parentId
  );

  if (result.success) {
    broadcastToRoom(connection.roomId, {
      type: 'node:add',
      roomId: connection.roomId,
      userId: connection.userId,
      timestamp: Date.now(),
      version: result.version,
      data: { node: data.node, parentId: data.parentId },
    });

    sendToConnection(connectionId, {
      type: 'sync:ack',
      roomId: connection.roomId,
      data: { version: result.version },
    });
  } else {
    sendToConnection(connectionId, {
      type: 'error',
      data: { message: 'Failed to add node' },
    });
  }
}

export function handleNodeUpdate(
  connectionId: string,
  data: { nodeId: string; changes: Partial<MindmapNode> }
): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const result = updateNode(
    connection.roomId,
    connection.userId,
    data.nodeId,
    data.changes
  );

  if (result.success) {
    broadcastToRoom(connection.roomId, {
      type: 'node:update',
      roomId: connection.roomId,
      userId: connection.userId,
      timestamp: Date.now(),
      version: result.version,
      data: { nodeId: data.nodeId, changes: data.changes },
    });

    sendToConnection(connectionId, {
      type: 'sync:ack',
      roomId: connection.roomId,
      data: { version: result.version },
    });
  } else {
    sendToConnection(connectionId, {
      type: 'error',
      data: { message: 'Failed to update node' },
    });
  }
}

export function handleNodeDelete(
  connectionId: string,
  data: { nodeId: string }
): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const result = deleteNode(
    connection.roomId,
    connection.userId,
    data.nodeId
  );

  if (result.success) {
    broadcastToRoom(connection.roomId, {
      type: 'node:delete',
      roomId: connection.roomId,
      userId: connection.userId,
      timestamp: Date.now(),
      version: result.version,
      data: { nodeId: data.nodeId },
    });

    sendToConnection(connectionId, {
      type: 'sync:ack',
      roomId: connection.roomId,
      data: { version: result.version },
    });
  } else {
    sendToConnection(connectionId, {
      type: 'error',
      data: { message: 'Failed to delete node' },
    });
  }
}

export function handleNodeMove(
  connectionId: string,
  data: { nodeId: string; newParentId: string }
): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const result = moveNode(
    connection.roomId,
    connection.userId,
    data.nodeId,
    data.newParentId
  );

  if (result.success) {
    broadcastToRoom(connection.roomId, {
      type: 'node:move',
      roomId: connection.roomId,
      userId: connection.userId,
      timestamp: Date.now(),
      version: result.version,
      data: { nodeId: data.nodeId, targetParentId: data.newParentId },
    });

    sendToConnection(connectionId, {
      type: 'sync:ack',
      roomId: connection.roomId,
      data: { version: result.version },
    });
  } else {
    sendToConnection(connectionId, {
      type: 'error',
      data: { message: 'Failed to move node' },
    });
  }
}

export function handleSyncRequest(connectionId: string): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const state = getRoomState(connection.roomId);
  if (state) {
    sendToConnection(connectionId, {
      type: 'sync:full',
      roomId: connection.roomId,
      data: {
        mindmap: state.mindmap,
        participants: state.participants,
        version: state.version,
      },
    });
  }
}

