/**
 * @file node-handlers.ts
 * @brief Node operation handlers
 */

import type { MindmapNode as ExportNode } from '@/lib/tools/mindmap-export';
import type { MindmapNode } from '@/types/tools';
import { addNode, updateNode, deleteNode, moveNode, getRoomState } from '../mindmap-room';
import { connections } from './connection-manager';
import { sendToConnection, broadcastToRoom } from './messaging-utils';
import { convertExportNodeToToolNode } from '../mindmap-room/node-converter';

export function handleNodeAdd(
  connectionId: string,
  data: { node: MindmapNode; parentId: string }
): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const toolNode = 'text' in data.node ? convertExportNodeToToolNode(data.node as ExportNode) : data.node;
  const result = addNode(connection.roomId, connection.userId, toolNode, data.parentId);

  if (result.success) {
    broadcastToRoom(connection.roomId, {
      type: 'node:added',
      roomId: connection.roomId,
      data: { nodeId: toolNode.id, node: toolNode, parentId: data.parentId, userId: connection.userId },
      timestamp: Date.now(),
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
  data: { nodeId: string; changes: Partial<MindmapNode> | Partial<ExportNode> }
): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const toolChanges: Partial<MindmapNode> =
    'text' in data.changes && data.changes.text ? { label: data.changes.text } : (data.changes as Partial<MindmapNode>);

  const result = updateNode(
    connection.roomId,
    connection.userId,
    data.nodeId,
    toolChanges
  );

  if (result.success) {
    broadcastToRoom(connection.roomId, {
      type: 'node:updated',
      roomId: connection.roomId,
      data: { nodeId: data.nodeId, changes: toolChanges, userId: connection.userId },
      timestamp: Date.now(),
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
      type: 'node:deleted',
      roomId: connection.roomId,
      data: { nodeId: data.nodeId, userId: connection.userId },
      timestamp: Date.now(),
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
      type: 'node:moved',
      roomId: connection.roomId,
      data: { nodeId: data.nodeId, newParentId: data.newParentId, userId: connection.userId },
      timestamp: Date.now(),
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

