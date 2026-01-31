// ============================================================================
// API ROUTE: Cursor Broadcasting
// Broadcast cursor position to room participants
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getRoom, updateCursor } from "@/lib/collab/mindmap-room";
import { broadcastCollabEvent } from "@/app/api/collab/sse/route";

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- Realtime collab; no cookie auth, userId from body
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { roomId } = await params;

  try {
    const { userId, cursor } = await request.json();

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
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to broadcast cursor", message: String(error) },
      { status: 500 },
    );
  }
}
