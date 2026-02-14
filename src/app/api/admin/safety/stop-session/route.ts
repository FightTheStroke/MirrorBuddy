/**
 * Admin Safety - Force Stop Session API
 * F-15 - Human oversight intervention for high-risk AI systems
 * Compliance: AI Act Art.14 (human oversight)
 *
 * Forcibly terminates an active chat session when safety concerns are detected.
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { logAdminAction } from "@/lib/admin/audit-service";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";


export const revalidate = 0;
const log = logger.child({ module: "safety-intervention" });

export const POST = pipe(
  withSentry("/api/admin/safety/stop-session"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = (await ctx.req.json()) as {
    sessionId: string;
    reason?: string;
  };

  const { sessionId, reason } = body;

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID is required" },
      { status: 400 },
    );
  }

  // Verify conversation exists
  const conversation = await prisma.conversation.findUnique({
    where: { id: sessionId },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  // Mark conversation as inactive
  const updated = await prisma.conversation.update({
    where: { id: sessionId },
    data: { isActive: false },
  });

  // Log the admin action
  await logAdminAction({
    action: "FORCE_STOP_SESSION",
    entityType: "Conversation",
    entityId: sessionId,
    adminId: ctx.userId!,
    details: {
      reason: reason || "Safety intervention",
      userId: conversation.userId,
      maestroId: conversation.maestroId,
      previousState: conversation.isActive,
    },
  });

  log.info("Conversation force-stopped via safety intervention", {
    sessionId,
    userId: conversation.userId,
    adminId: ctx.userId,
    reason,
  });

  return NextResponse.json({
    success: true,
    conversation: {
      id: updated.id,
      isActive: updated.isActive,
    },
  });
});
