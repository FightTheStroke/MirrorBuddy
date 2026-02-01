// ============================================================================
// API ROUTE: Selection Broadcasting
// Broadcast node selection to room participants
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import { NextResponse } from "next/server";
import { getRoom, updateSelection } from "@/lib/collab/mindmap-room";
import { broadcastCollabEvent } from "@/app/api/collab/sse/route";
import { pipe } from "@/lib/api/pipe";
import { withSentry } from "@/lib/api/middlewares";

export const POST = pipe(withSentry("/api/collab/rooms/:roomId/select"))(async (
  ctx,
) => {
  const { roomId } = await ctx.params;
  const { userId, nodeId } = await ctx.req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Update selection in room state
  updateSelection(roomId, userId, nodeId || undefined);

  // Broadcast to other participants
  broadcastCollabEvent(
    {
      type: "user:select",
      roomId,
      userId,
      timestamp: Date.now(),
      data: { nodeId: nodeId || null },
    },
    userId,
  );

  return NextResponse.json({ success: true });
});
