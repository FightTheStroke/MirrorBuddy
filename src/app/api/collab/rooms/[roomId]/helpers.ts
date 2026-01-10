/**
 * Collaboration room action helpers
 */

import { NextResponse } from 'next/server';
import {
  getRoom,
  getRoomState,
  joinRoom,
  leaveRoom,
  addNode,
  updateNode,
  deleteNode,
  moveNode,
} from '@/lib/collab/mindmap-room';
import type { MindmapNode as ExportNode } from '@/lib/tools/mindmap-export';
import type { RoomUser } from '@/lib/collab/mindmap-room/types';
import type { MindmapNode } from '@/types/tools';
import { convertExportNodeToToolNode } from '@/lib/collab/mindmap-room/node-converter';

/**
 * Validate room exists and return it
 */
export function validateRoomExists(roomId: string) {
  const room = getRoom(roomId);
  if (!room) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      ),
    };
  }
  return { valid: true, room };
}

/**
 * Handle 'join' action
 */
export function handleJoinAction(roomId: string, user: unknown) {
  const userData = user as { id?: string; name?: string };
  if (!userData || !userData.id || !userData.name) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'user with id and name is required' },
        { status: 400 }
      ),
    };
  }

  const result = joinRoom(roomId, userData as RoomUser);
  if (!result) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Failed to join room' },
        { status: 500 }
      ),
    };
  }

  const state = getRoomState(roomId);
  return {
    success: true,
    response: NextResponse.json({
      success: true,
      participant: result.participant,
      mindmap: state?.mindmap,
      participants: state?.participants,
      version: state?.version,
    }),
  };
}

/**
 * Handle 'leave' action
 */
export function handleLeaveAction(roomId: string, user: unknown) {
  const userData = user as { id?: string };
  if (!userData?.id) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'user.id is required' },
        { status: 400 }
      ),
    };
  }

  leaveRoom(roomId, userData.id);
  return {
    success: true,
    response: NextResponse.json({ success: true }),
  };
}

/**
 * Handle 'add_node' action
 */
export function handleAddNodeAction(
  roomId: string,
  user: unknown,
  node: unknown,
  parentId: unknown
) {
  const userData = user as { id?: string };
  if (!userData?.id || !node || !parentId) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'user.id, node, and parentId are required' },
        { status: 400 }
      ),
    };
  }

  const toolNode = convertExportNodeToToolNode(node as ExportNode);
  const result = addNode(roomId, userData.id, toolNode, String(parentId));

  return {
    success: true,
    response: NextResponse.json({
      success: result.success,
      version: result.version,
    }),
  };
}

/**
 * Handle 'update_node' action
 */
export function handleUpdateNodeAction(
  roomId: string,
  user: unknown,
  nodeId: unknown,
  changes: unknown
) {
  const userData = user as { id?: string };
  if (!userData?.id || !nodeId || !changes) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'user.id, nodeId, and changes are required' },
        { status: 400 }
      ),
    };
  }

  const result = updateNode(roomId, userData.id, String(nodeId), changes as Partial<MindmapNode>);

  return {
    success: true,
    response: NextResponse.json({
      success: result.success,
      version: result.version,
    }),
  };
}

/**
 * Handle 'delete_node' action
 */
export function handleDeleteNodeAction(
  roomId: string,
  user: unknown,
  nodeId: unknown
) {
  const userData = user as { id?: string };
  if (!userData?.id || !nodeId) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'user.id and nodeId are required' },
        { status: 400 }
      ),
    };
  }

  const result = deleteNode(roomId, userData.id, String(nodeId));

  return {
    success: true,
    response: NextResponse.json({
      success: result.success,
      version: result.version,
    }),
  };
}

/**
 * Handle 'move_node' action
 */
export function handleMoveNodeAction(
  roomId: string,
  user: unknown,
  nodeId: unknown,
  newParentId: unknown
) {
  const userData = user as { id?: string };
  if (!userData?.id || !nodeId || !newParentId) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'user.id, nodeId, and newParentId are required' },
        { status: 400 }
      ),
    };
  }

  const result = moveNode(roomId, userData.id, String(nodeId), String(newParentId));

  return {
    success: true,
    response: NextResponse.json({
      success: result.success,
      version: result.version,
    }),
  };
}
