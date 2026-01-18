import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { getInvites } from "@/lib/invite/invite-service";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    // Verify admin
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get status filter from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as
      | "PENDING"
      | "APPROVED"
      | "REJECTED"
      | null;

    const invites = await getInvites(status || undefined);

    return NextResponse.json({ invites });
  } catch (error) {
    logger.error("Failed to fetch invites", undefined, error as Error);
    return NextResponse.json(
      { error: "Errore durante il caricamento" },
      { status: 500 },
    );
  }
}
