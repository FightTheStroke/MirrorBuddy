// ============================================================================
// API ROUTE: Cursor Broadcasting
// Broadcast cursor position to room participants
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import { NextResponse } from 'next/server';
import { getRoom, updateCursor } from '@/lib/collab/mindmap-room';
import { broadcastCollabEvent } from '@/app/api/collab/sse/route';
import { pipe } from '@/lib/api/pipe';
import { withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';


export const revalidate = 0;
export const POST = pipe(
  withSentry('/api/collab/rooms/:roomId/cursor'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { roomId } = await ctx.params;
  const { cursor } = await ctx.req.json();
  const userId = ctx.userId!;

  if (!cursor || typeof cursor.x !== 'number' || typeof cursor.y !== 'number') {
    return NextResponse.json({ error: 'cursor (x, y) is required' }, { status: 400 });
  }

  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  // Update cursor in room state
  const updated = updateCursor(roomId, userId, cursor);
  if (!updated) {
    return NextResponse.json({ error: 'Access denied: not a room participant' }, { status: 403 });
  }

  // Broadcast to other participants
  broadcastCollabEvent(
    {
      type: 'user:cursor',
      roomId,
      userId,
      timestamp: Date.now(),
      data: { cursor },
    },
    userId,
  );

  return NextResponse.json({ success: true });
});
