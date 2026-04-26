import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { migrateTrialData } from "@/lib/invite/trial-migration";
import { trackInviteFirstLogin } from "@/lib/telemetry/invite-events";
import { logger } from "@/lib/logger";


export const revalidate = 0;
export const POST = pipe(
  withSentry("/api/user/migrate-trial"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body = await ctx.req.json();
  const { trialSessionId } = body as { trialSessionId: string };

  if (!trialSessionId) {
    return NextResponse.json(
      { error: "trialSessionId is required" },
      { status: 400 },
    );
  }

  const result = await migrateTrialData(userId, trialSessionId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Track first login with migration
  trackInviteFirstLogin(userId, true);

  logger.info("Trial data migrated via API", {
    userId,
    trialSessionId,
    migratedItems: result.migratedItems,
  });

  return NextResponse.json({
    success: true,
    migratedItems: result.migratedItems,
  });
});
