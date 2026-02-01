import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { rejectInviteRequest } from "@/lib/invite/invite-service";
import { logger } from "@/lib/logger";
import { calculateAndPublishAdminCounts } from "@/lib/helpers/publish-admin-counts";

export const POST = pipe(
  withSentry("/api/invites/reject"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const userId = ctx.userId!;
  const body = await ctx.req.json();
  const { requestId, reason } = body as {
    requestId: string;
    reason?: string;
  };

  if (!requestId) {
    return NextResponse.json(
      { error: "requestId is required" },
      { status: 400 },
    );
  }

  const result = await rejectInviteRequest(requestId, userId, reason);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  logger.info("Admin rejected invite", {
    requestId,
    adminId: userId,
    hasReason: !!reason,
  });

  // Trigger admin counts push (F-06, F-27, F-32: non-blocking, rate-limited per event type)
  calculateAndPublishAdminCounts("invite").catch((err) =>
    logger.warn("Failed to publish admin counts on invite rejection", {
      error: String(err),
    }),
  );

  return NextResponse.json({ success: true });
});
