// ============================================================================
// API ROUTE: Selection Broadcasting
// Broadcast node selection to room participants
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateSelection } from '@/lib/collab/mindmap-room';
import { broadcastCollabEvent } from '@/app/api/collab/sse/route';

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const { roomId } = await params;

  try {
    const { userId, nodeId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
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

    // Update selection in room state
    updateSelection(roomId, userId, nodeId || undefined);

    // Broadcast to other participants
    broadcastCollabEvent({
      type: 'user:select',
      roomId,
      userId,
      timestamp: Date.now(),
      data: { nodeId: nodeId || null },
    }, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to broadcast selection', message: String(error) },
      { status: 500 }
    );
  }
}
