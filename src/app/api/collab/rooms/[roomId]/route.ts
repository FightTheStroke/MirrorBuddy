/**
 * API ROUTE: Collaboration Room Operations
 * Get, join, leave, and close specific collaboration rooms
 * Part of Phase 8: Multi-User Collaboration
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getRoom, getRoomState, closeRoom } from "@/lib/collab/mindmap-room";
import {
  validateRoomExists,
  handleJoinAction,
  handleLeaveAction,
  handleAddNodeAction,
  handleUpdateNodeAction,
  handleDeleteNodeAction,
  handleMoveNodeAction,
} from "./helpers";
import { pipe } from "@/lib/api/pipe";
import { withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";

/**
 * GET /api/collab/rooms/[roomId] - Get room state
 */
export const GET = pipe(withSentry("/api/collab/rooms/:roomId"))(async (
  ctx,
) => {
  const { roomId } = await ctx.params;

  const state = getRoomState(roomId);

  if (!state) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    roomId,
    mindmap: state.mindmap,
    participants: state.participants,
    version: state.version,
  });
});

/**
 * POST /api/collab/rooms/[roomId] - Join room or perform action
 */

export const POST = pipe(withSentry("/api/collab/rooms/:roomId"))(async (
  ctx,
): Promise<NextResponse> => {
  const { roomId } = await ctx.params;

  const validation = validateRoomExists(roomId);
  if (!validation.valid) {
    return validation.response!;
  }

  const body = await ctx.req.json();
  const { action, user, nodeId, node, parentId, changes, newParentId } = body;

  let result: { response: NextResponse };

  switch (action) {
    case "join":
      result = handleJoinAction(roomId, user);
      break;

    case "leave":
      result = handleLeaveAction(roomId, user);
      logger.info("User left room via API", {
        roomId,
        userId: (user as { id?: string })?.id,
      });
      break;

    case "add_node":
      result = handleAddNodeAction(roomId, user, node, parentId);
      break;

    case "update_node":
      result = handleUpdateNodeAction(roomId, user, nodeId, changes);
      break;

    case "delete_node":
      result = handleDeleteNodeAction(roomId, user, nodeId);
      break;

    case "move_node":
      result = handleMoveNodeAction(roomId, user, nodeId, newParentId);
      break;

    default:
      return NextResponse.json(
        {
          error: "Invalid action",
          validActions: [
            "join",
            "leave",
            "add_node",
            "update_node",
            "delete_node",
            "move_node",
          ],
        },
        { status: 400 },
      );
  }

  if (action === "join") {
    logger.info("User joined room via API", {
      roomId,
      userId: (user as { id?: string })?.id,
    });
  }

  return result.response;
});

/**
 * DELETE /api/collab/rooms/[roomId] - Close room (host only)
 */
export const DELETE = pipe(
  withSentry("/api/collab/rooms/:roomId"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { roomId } = await ctx.params;
  const userId = ctx.userId!;

  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const participants = Array.from(room.participants.values());
  const isHost = participants.length > 0 && participants[0].id === userId;

  if (!isHost) {
    return NextResponse.json(
      { error: "Only host can close room" },
      { status: 403 },
    );
  }

  closeRoom(roomId);

  logger.info("Room closed via API", {
    roomId,
    hostId: userId,
  });

  return NextResponse.json({ success: true });
});
