import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { migrateTrialData } from "@/lib/invite/trial-migration";
import { trackInviteFirstLogin } from "@/lib/telemetry/invite-events";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  // CSRF protection
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    // Verify authentication
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { trialSessionId } = body as { trialSessionId: string };

    if (!trialSessionId) {
      return NextResponse.json(
        { error: "trialSessionId is required" },
        { status: 400 },
      );
    }

    const result = await migrateTrialData(auth.userId, trialSessionId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Track first login with migration
    trackInviteFirstLogin(auth.userId, true);

    logger.info("Trial data migrated via API", {
      userId: auth.userId,
      trialSessionId,
      migratedItems: result.migratedItems,
    });

    return NextResponse.json({
      success: true,
      migratedItems: result.migratedItems,
    });
  } catch (error) {
    logger.error("Failed to migrate trial data", undefined, error as Error);
    return NextResponse.json(
      { error: "Errore durante la migrazione" },
      { status: 500 },
    );
  }
}
