import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { approveInviteRequest } from "@/lib/invite/invite-service";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
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
