import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { approveInviteRequest } from "@/lib/invite/invite-service";
import { logger } from "@/lib/logger";
import { calculateAndPublishAdminCounts } from "@/lib/helpers/publish-admin-counts";

export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  try {
    // Verify admin
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { requestId } = body as { requestId: string };

    if (!requestId) {
      return NextResponse.json(
        { error: "requestId is required" },
        { status: 400 },
      );
    }

    const result = await approveInviteRequest(requestId, auth.userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logger.info("Admin approved invite", {
      requestId,
      adminId: auth.userId,
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
  } catch (error) {
    logger.error("Failed to approve invite", undefined, error as Error);
    return NextResponse.json(
      { error: "Errore durante l'approvazione" },
      { status: 500 },
    );
  }
}
