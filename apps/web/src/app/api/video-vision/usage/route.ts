/**
 * API Route: Video Vision Usage Tracking
 *
 * POST /api/video-vision/usage
 *
 * Reports video vision usage events: start, frames, end.
 * Authenticated users only (Pro tier).
 *
 * ADR 0122: Realtime Video Vision
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import {
  canStartSession,
  startSession,
  addFrames,
  endSession,
} from "@/lib/tier/server";


export const revalidate = 0;
const StartSchema = z.object({
  action: z.literal("start"),
  voiceSessionId: z.string().min(1),
});

const FramesSchema = z.object({
  action: z.literal("frames"),
  usageId: z.string().min(1),
  count: z.number().int().min(1).max(100),
});

const EndSchema = z.object({
  action: z.literal("end"),
  usageId: z.string().min(1),
  secondsUsed: z.number().int().min(0).max(600),
});

const UsageSchema = z.discriminatedUnion("action", [
  StartSchema,
  FramesSchema,
  EndSchema,
]);

export const POST = pipe(
  withSentry("/api/video-vision/usage"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const body = await ctx.req.json();
  const validation = UsageSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request", details: validation.error.issues },
      { status: 400 },
    );
  }

  const data = validation.data;

  switch (data.action) {
    case "start": {
      const eligibility = await canStartSession(ctx.userId!);
      if (!eligibility.allowed) {
        return NextResponse.json(
          { error: eligibility.reason || "video_vision_denied" },
          { status: 403 },
        );
      }
      const result = await startSession(ctx.userId!, data.voiceSessionId);
      if (!result) {
        return NextResponse.json({ error: "internal_error" }, { status: 500 });
      }
      return NextResponse.json(result, { status: 201 });
    }

    case "frames": {
      const ok = await addFrames(data.usageId, data.count);
      if (!ok) {
        return NextResponse.json(
          { error: "Failed to record frames" },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    case "end": {
      const ok = await endSession(data.usageId, data.secondsUsed);
      if (!ok) {
        return NextResponse.json(
          { error: "Failed to end session" },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true });
    }
  }
});
