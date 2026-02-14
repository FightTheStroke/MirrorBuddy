// ============================================================================
// API ROUTE: Collaboration Rooms
// Create and list collaboration rooms for mindmaps
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createRoom, getRoomStats } from '@/lib/collab/mindmap-room';
import type { MindmapData as ExportMindmapData } from '@/lib/tools/mindmap-export/index';
import type { MindmapData as _MindmapData } from '@/lib/collab/mindmap-room';
import { convertExportNodeToToolNode } from '@/lib/collab/mindmap-room/node-converter';
import { pipe } from '@/lib/api/pipe';
import { withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';


export const revalidate = 0;
interface CreateRoomRequest {
  mindmap: ExportMindmapData;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
}

/**
 * POST /api/collab/rooms - Create a new collaboration room
 */

export const POST = pipe(
  withSentry('/api/collab/rooms'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const body: CreateRoomRequest = await ctx.req.json();
  const { mindmap, user } = body;

  // Validate required fields
  if (!mindmap || !mindmap.root) {
    return NextResponse.json({ error: 'mindmap with root node is required' }, { status: 400 });
  }

  if (!user || !user.name) {
    return NextResponse.json({ error: 'user with name is required' }, { status: 400 });
  }
  const userId = ctx.userId!;

  // Generate room ID
  const roomId = `room_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  // Convert export format to tool format
  const toolRoot = convertExportNodeToToolNode(mindmap.root);

  // Create room
  const room = createRoom(roomId, { ...user, id: userId }, toolRoot);

  logger.info('Collaboration room created via API', {
    roomId: room.id,
    hostId: userId,
  });

  return NextResponse.json(
    {
      success: true,
      room: {
        roomId: room.id,
        mindmapId: toolRoot.id,
        participantCount: room.participants.size,
        version: room.version,
        createdAt: room.createdAt,
      },
    },
    { status: 201 },
  );
});

/**
 * GET /api/collab/rooms - List all active rooms (for admin/monitoring)
 */
export const GET = pipe(
  withSentry('/api/collab/rooms'),
  withAuth,
)(async () => {
  const stats = getRoomStats();

  return NextResponse.json({
    success: true,
    stats: {
      totalRooms: stats.totalRooms,
      totalParticipants: stats.totalParticipants,
    },
    rooms: stats.rooms,
  });
});
