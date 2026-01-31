import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { AdaptiveSignalsPayloadSchema } from "@/lib/validation/schemas/adaptive";
import {
  normalizeAdaptiveDifficultyMode,
  recordAdaptiveSignalsBatch,
} from "@/lib/education/adaptive-difficulty";
import type { AdaptiveSignalInput } from "@/types/adaptive-difficulty";

export async function POST(request: NextRequest) {
  // CSRF protection
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json(
        { error: auth.error || "No user" },
        { status: 401 },
      );
    }
    const userId = auth.userId;

    const body = await request.json();
    const validation = AdaptiveSignalsPayloadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid adaptive signal payload",
          details: validation.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    const settings = await prisma.settings.findUnique({
      where: { userId },
      select: { adaptiveDifficultyMode: true },
    });
    const mode = normalizeAdaptiveDifficultyMode(
      settings?.adaptiveDifficultyMode,
    );

    // Batch process all signals to avoid N+1 queries
    const signalsWithMode = validation.data.signals.map((signal) => ({
      ...signal,
      mode,
      metadata: signal.metadata as AdaptiveSignalInput["metadata"],
    }));
    const latestProfile = await recordAdaptiveSignalsBatch(
      userId,
      signalsWithMode,
    );

    return NextResponse.json({ ok: true, profile: latestProfile });
  } catch (error) {
    logger.error("[AdaptiveDifficulty] Signals POST error", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Failed to record adaptive signals" },
      { status: 500 },
    );
  }
}
