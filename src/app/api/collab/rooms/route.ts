// ============================================================================
// API ROUTE: Collaboration Rooms
// Create and list collaboration rooms for mindmaps
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createRoom, getRoomStats } from '@/lib/collab/mindmap-room';
import type { MindmapData } from '@/lib/tools/mindmap-export';

interface CreateRoomRequest {
  mindmap: MindmapData;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
}

/**
 * POST /api/collab/rooms - Create a new collaboration room
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateRoomRequest = await request.json();
    const { mindmap, user } = body;

    // Validate required fields
    if (!mindmap || !mindmap.root) {
      return NextResponse.json(
        { error: 'mindmap with root node is required' },
        { status: 400 }
      );
    }

    if (!user || !user.id || !user.name) {
      return NextResponse.json(
        { error: 'user with id and name is required' },
        { status: 400 }
      );
    }

    // Validate user ID format
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(user.id)) {
      return NextResponse.json(
        { error: 'Invalid user.id format' },
        { status: 400 }
      );
    }

    // Create room
    const room = createRoom(mindmap, user);

    logger.info('Collaboration room created via API', {
      roomId: room.roomId,
      hostId: user.id,
      mindmapTitle: mindmap.title,
    });

    return NextResponse.json({
      success: true,
      room: {
        roomId: room.roomId,
        mindmapId: room.mindmapId,
        hostId: room.hostId,
        participantCount: room.participants.size,
        version: room.version,
        createdAt: room.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create collaboration room', {
      error: String(error),
    });

    return NextResponse.json(
      { error: 'Failed to create room', message: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/collab/rooms - List all active rooms (for admin/monitoring)
 */
export async function GET() {
  try {
    const stats = getRoomStats();

    return NextResponse.json({
      success: true,
      stats: {
        totalRooms: stats.totalRooms,
        totalParticipants: stats.totalParticipants,
      },
      rooms: stats.rooms,
    });
  } catch (error) {
    logger.error('Failed to get room stats', {
      error: String(error),
    });

    return NextResponse.json(
      { error: 'Failed to get rooms', message: String(error) },
      { status: 500 }
    );
  }
}
