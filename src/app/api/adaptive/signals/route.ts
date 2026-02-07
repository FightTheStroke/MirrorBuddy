import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AdaptiveSignalsPayloadSchema } from "@/lib/validation/schemas/adaptive";
import { normalizeAdaptiveDifficultyMode } from "@/lib/education";
import { recordAdaptiveSignalsBatch } from "@/lib/education/server";
import type { AdaptiveSignalInput } from "@/types/adaptive-difficulty";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";

export const POST = pipe(
  withSentry("/api/adaptive/signals"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body = await ctx.req.json();
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
});
