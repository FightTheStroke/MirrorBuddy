/**
 * Node CRUD operations for collaboration
 */

import type { MindmapNode } from "@/lib/tools/mindmap-export/index";
import { csrfFetch } from "@/lib/auth/csrf-client";

/**
 * Add a node to the mindmap
 */
export async function addNodeToRoom(
  roomId: string,
  userId: string,
  node: MindmapNode,
  parentId: string,
): Promise<boolean> {
  try {
    const response = await csrfFetch(`/api/collab/rooms/${roomId}`, {
      method: "POST",
      body: JSON.stringify({
        action: "add_node",
        user: { id: userId },
        node,
        parentId,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Update a node in the mindmap
 */
export async function updateNodeInRoom(
  roomId: string,
  userId: string,
  nodeId: string,
  changes: Partial<MindmapNode>,
): Promise<boolean> {
  try {
    const response = await csrfFetch(`/api/collab/rooms/${roomId}`, {
      method: "POST",
      body: JSON.stringify({
        action: "update_node",
        user: { id: userId },
        nodeId,
        changes,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Delete a node from the mindmap
 */
export async function deleteNodeFromRoom(
  roomId: string,
  userId: string,
  nodeId: string,
): Promise<boolean> {
  try {
    const response = await csrfFetch(`/api/collab/rooms/${roomId}`, {
      method: "POST",
      body: JSON.stringify({
        action: "delete_node",
        user: { id: userId },
        nodeId,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Move a node to a new parent
 */
export async function moveNodeInRoom(
  roomId: string,
  userId: string,
  nodeId: string,
  newParentId: string,
): Promise<boolean> {
  try {
    const response = await csrfFetch(`/api/collab/rooms/${roomId}`, {
      method: "POST",
      body: JSON.stringify({
        action: "move_node",
        user: { id: userId },
        nodeId,
        newParentId,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
