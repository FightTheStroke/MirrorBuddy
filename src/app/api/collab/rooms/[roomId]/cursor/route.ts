// ============================================================================
// API ROUTE: Cursor Broadcasting
// Broadcast cursor position to room participants
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import { NextResponse } from "next/server";
import { getRoom, updateCursor } from "@/lib/collab/mindmap-room";
import { broadcastCollabEvent } from "@/app/api/collab/sse/route";
import { pipe } from "@/lib/api/pipe";
import { withSentry } from "@/lib/api/middlewares";

export const POST = pipe(withSentry("/api/collab/rooms/:roomId/cursor"))(async (
  ctx,
) => {
  const { roomId } = await ctx.params;
  const { userId, cursor } = await ctx.req.json();

  if (
    !userId ||
    !cursor ||
    typeof cursor.x !== "number" ||
    typeof cursor.y !== "number"
  ) {
    return NextResponse.json(
      { error: "userId and cursor (x, y) are required" },
      { status: 400 },
    );
  }

  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Update cursor in room state
  updateCursor(roomId, userId, cursor);

  // Broadcast to other participants
  broadcastCollabEvent(
    {
      type: "user:cursor",
      roomId,
      userId,
      timestamp: Date.now(),
      data: { cursor },
    },
    userId,
  );

  return NextResponse.json({ success: true });
});
