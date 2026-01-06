// ============================================================================
// API ROUTE: Collaboration Room Operations
// Get, join, leave, and close specific collaboration rooms
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  getRoom,
  getRoomState,
  joinRoom,
  leaveRoom,
  closeRoom,
  addNode,
  updateNode,
  deleteNode,
  moveNode,
} from '@/lib/collab/mindmap-room';
import type { MindmapNode as ExportNode } from '@/lib/tools/mindmap-export';
import type { MindmapNode as _MindmapNode } from '@/types/tools';
import { convertExportNodeToToolNode } from '@/lib/collab/mindmap-room/node-converter';

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

/**
 * GET /api/collab/rooms/[roomId] - Get room state
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { roomId } = await params;

  try {
    const state = getRoomState(roomId);

    if (!state) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      roomId,
      mindmap: state.mindmap,
      participants: state.participants,
      version: state.version,
    });
  } catch (error) {
    logger.error('Failed to get room state', {
      roomId,
      error: String(error),
    });

    return NextResponse.json(
      { error: 'Failed to get room', message: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collab/rooms/[roomId] - Join room or perform action
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const { roomId } = await params;

  try {
    const body = await request.json();
    const { action, user, nodeId, node, parentId, changes, newParentId } = body;

    // Validate room exists
    const room = getRoom(roomId);
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'join': {
        if (!user || !user.id || !user.name) {
          return NextResponse.json(
            { error: 'user with id and name is required' },
            { status: 400 }
          );
        }

        const result = joinRoom(roomId, user);
        if (!result) {
          return NextResponse.json(
            { error: 'Failed to join room' },
            { status: 500 }
          );
        }

        const state = getRoomState(roomId);

        logger.info('User joined room via API', {
          roomId,
          userId: user.id,
        });

        return NextResponse.json({
          success: true,
          participant: result.participant,
          mindmap: state?.mindmap,
          participants: state?.participants,
          version: state?.version,
        });
      }

      case 'leave': {
        if (!user?.id) {
          return NextResponse.json(
            { error: 'user.id is required' },
            { status: 400 }
          );
        }

        leaveRoom(roomId, user.id);

        logger.info('User left room via API', {
          roomId,
          userId: user.id,
        });

        return NextResponse.json({ success: true });
      }

      case 'add_node': {
        if (!user?.id || !node || !parentId) {
          return NextResponse.json(
            { error: 'user.id, node, and parentId are required' },
            { status: 400 }
          );
        }

        const toolNode = convertExportNodeToToolNode(node as ExportNode);
        const result = addNode(roomId, user.id, toolNode, parentId);

        return NextResponse.json({
          success: result.success,
          version: result.version,
        });
      }

      case 'update_node': {
        if (!user?.id || !nodeId || !changes) {
          return NextResponse.json(
            { error: 'user.id, nodeId, and changes are required' },
            { status: 400 }
          );
        }

        const result = updateNode(roomId, user.id, nodeId, changes);

        return NextResponse.json({
          success: result.success,
          version: result.version,
        });
      }

      case 'delete_node': {
        if (!user?.id || !nodeId) {
          return NextResponse.json(
            { error: 'user.id and nodeId are required' },
            { status: 400 }
          );
        }

        const result = deleteNode(roomId, user.id, nodeId);

        return NextResponse.json({
          success: result.success,
          version: result.version,
        });
      }

      case 'move_node': {
        if (!user?.id || !nodeId || !newParentId) {
          return NextResponse.json(
            { error: 'user.id, nodeId, and newParentId are required' },
            { status: 400 }
          );
        }

        const result = moveNode(roomId, user.id, nodeId, newParentId);

        return NextResponse.json({
          success: result.success,
          version: result.version,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action', validActions: ['join', 'leave', 'add_node', 'update_node', 'delete_node', 'move_node'] },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Failed to perform room action', {
      roomId,
      error: String(error),
    });

    return NextResponse.json(
      { error: 'Failed to perform action', message: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/collab/rooms/[roomId] - Close room (host only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const { roomId } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const room = getRoom(roomId);
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check if user is a participant (first participant is considered host)
    const participants = Array.from(room.participants.values());
    const isHost = participants.length > 0 && participants[0].id === userId;
    
    if (!isHost) {
      return NextResponse.json(
        { error: 'Only host can close room' },
        { status: 403 }
      );
    }

    closeRoom(roomId);

    logger.info('Room closed via API', {
      roomId,
      hostId: userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to close room', {
      roomId,
      error: String(error),
    });

    return NextResponse.json(
      { error: 'Failed to close room', message: String(error) },
      { status: 500 }
    );
  }
}
