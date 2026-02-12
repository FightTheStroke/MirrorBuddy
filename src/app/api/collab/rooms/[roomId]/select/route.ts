// ============================================================================
// API ROUTE: Selection Broadcasting
// Broadcast node selection to room participants
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import { NextResponse } from 'next/server';
import { getRoom, updateSelection } from '@/lib/collab/mindmap-room';
import { broadcastCollabEvent } from '@/app/api/collab/sse/route';
import { pipe } from '@/lib/api/pipe';
import { withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';

export const POST = pipe(
  withSentry('/api/collab/rooms/:roomId/select'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { roomId } = await ctx.params;
  const { nodeId } = await ctx.req.json();
  const userId = ctx.userId!;

  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  // Update selection in room state
  const updated = updateSelection(roomId, userId, nodeId || undefined);
  if (!updated) {
    return NextResponse.json({ error: 'Access denied: not a room participant' }, { status: 403 });
  }

  // Broadcast to other participants
  broadcastCollabEvent(
    {
      type: 'user:select',
      roomId,
      userId,
      timestamp: Date.now(),
      data: { nodeId: nodeId || null },
    },
    userId,
  );

  return NextResponse.json({ success: true });
});
