import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { approveInviteRequest } from "@/lib/invite/invite-service";
import { logger } from "@/lib/logger";
import { calculateAndPublishAdminCounts } from "@/lib/helpers/publish-admin-counts";

export const POST = pipe(
  withSentry("/api/invites/approve"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const userId = ctx.userId!;
  const body = await ctx.req.json();
  const { requestId } = body as { requestId: string };

  if (!requestId) {
    return NextResponse.json(
      { error: "requestId is required" },
      { status: 400 },
    );
  }

  const result = await approveInviteRequest(requestId, userId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  logger.info("Admin approved invite", {
    requestId,
    adminId: userId,
    newUserId: result.userId,
  });

  // Trigger admin counts push (F-06, F-27, F-32: non-blocking, rate-limited per event type)
  calculateAndPublishAdminCounts("invite").catch((err) =>
    logger.warn("Failed to publish admin counts on invite approval", {
      error: String(err),
    }),
  );

  return NextResponse.json({
    success: true,
    userId: result.userId,
    username: result.username,
  });
});
