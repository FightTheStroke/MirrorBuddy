import { logger } from '@/lib/logger';
import type { MindmapNode } from '@/types/tools';
import type { MindmapRoom as _MindmapRoom } from './types';
import { rooms } from './room-manager';

function findNode(
  root: MindmapNode,
  nodeId: string
): { node: MindmapNode; parent: MindmapNode | null } | null {
  if (root.id === nodeId) {
    return { node: root, parent: null };
  }

  if (root.children) {
    for (const child of root.children) {
      if (child.id === nodeId) {
        return { node: child, parent: root };
      }
      const found = findNode(child, nodeId);
      if (found) return found;
    }
  }

  return null;
}

export function addNode(
  roomId: string,
  userId: string,
  node: MindmapNode,
  parentId: string
): { success: boolean; version: number } {
  const room = rooms.get(roomId);
  if (!room) return { success: false, version: 0 };

  const found = findNode(room.mindmapState.root, parentId);
  if (!found) {
    logger.warn('Parent node not found', { roomId, parentId });
    return { success: false, version: room.version };
  }

  if (!found.node.children) {
    found.node.children = [];
  }

  const newNode: MindmapNode = {
    ...node,
    id: node.id || `node_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
  };

  found.node.children.push(newNode);
  room.version++;
  room.updatedAt = Date.now();
  room.mindmapState.updatedAt = new Date().toISOString();

  logger.debug('Node added to mindmap', {
    roomId,
    userId,
    nodeId: newNode.id,
    parentId,
    version: room.version,
  });

  return { success: true, version: room.version };
}

export function updateNode(
  roomId: string,
  userId: string,
  nodeId: string,
  changes: Partial<MindmapNode>
): { success: boolean; version: number } {
  const room = rooms.get(roomId);
  if (!room) return { success: false, version: 0 };

  const found = findNode(room.mindmapState.root, nodeId);
  if (!found) {
    logger.warn('Node not found for update', { roomId, nodeId });
    return { success: false, version: room.version };
  }

  const { id: _id, ...safeChanges } = changes;
  Object.assign(found.node, safeChanges);

  room.version++;
  room.updatedAt = Date.now();
  room.mindmapState.updatedAt = new Date().toISOString();

  logger.debug('Node updated', {
    roomId,
    userId,
    nodeId,
    changes: Object.keys(safeChanges),
    version: room.version,
  });

  return { success: true, version: room.version };
}

export function deleteNode(
  roomId: string,
  userId: string,
  nodeId: string
): { success: boolean; version: number } {
  const room = rooms.get(roomId);
  if (!room) return { success: false, version: 0 };

  if (room.mindmapState.root.id === nodeId) {
    logger.warn('Attempted to delete root node', { roomId, userId });
    return { success: false, version: room.version };
  }

  const found = findNode(room.mindmapState.root, nodeId);
  if (!found || !found.parent) {
    logger.warn('Node not found for deletion', { roomId, nodeId });
    return { success: false, version: room.version };
  }

  found.parent.children = found.parent.children?.filter((c) => c.id !== nodeId);

  room.version++;
  room.updatedAt = Date.now();
  room.mindmapState.updatedAt = new Date().toISOString();

  logger.debug('Node deleted', {
    roomId,
    userId,
    nodeId,
    version: room.version,
  });

  return { success: true, version: room.version };
}

export function moveNode(
  roomId: string,
  userId: string,
  nodeId: string,
  newParentId: string
): { success: boolean; version: number } {
  const room = rooms.get(roomId);
  if (!room) return { success: false, version: 0 };

  if (room.mindmapState.root.id === nodeId) {
    return { success: false, version: room.version };
  }

  const foundNode = findNode(room.mindmapState.root, nodeId);
  const foundNewParent = findNode(room.mindmapState.root, newParentId);

  if (!foundNode || !foundNode.parent || !foundNewParent) {
    return { success: false, version: room.version };
  }

  if (findNode(foundNode.node, newParentId)) {
    logger.warn('Attempted to move node to its own descendant', { roomId, nodeId, newParentId });
    return { success: false, version: room.version };
  }

  foundNode.parent.children = foundNode.parent.children?.filter((c) => c.id !== nodeId);

  if (!foundNewParent.node.children) {
    foundNewParent.node.children = [];
  }
  foundNewParent.node.children.push(foundNode.node);

  room.version++;
  room.updatedAt = Date.now();
  room.mindmapState.updatedAt = new Date().toISOString();

  logger.debug('Node moved', {
    roomId,
    userId,
    nodeId,
    newParentId,
    version: room.version,
  });

  return { success: true, version: room.version };
}

