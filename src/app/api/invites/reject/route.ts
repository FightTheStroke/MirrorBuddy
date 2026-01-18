import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { rejectInviteRequest } from "@/lib/invite/invite-service";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    // Verify admin
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
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

    const result = await rejectInviteRequest(requestId, auth.userId, reason);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logger.info("Admin rejected invite", {
      requestId,
      adminId: auth.userId,
      hasReason: !!reason,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to reject invite", undefined, error as Error);
    return NextResponse.json(
      { error: "Errore durante il rifiuto" },
      { status: 500 },
    );
  }
}
