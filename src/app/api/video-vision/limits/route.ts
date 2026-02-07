/**
 * API Route: Video Vision Limits
 *
 * GET /api/video-vision/limits
 *
 * Returns current video vision limits and usage for the authenticated user.
 * Used by the frontend to show remaining time and eligibility.
 *
 * ADR 0122: Realtime Video Vision
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";
import { getLimitsAndUsage } from "@/lib/tier";

export const GET = pipe(
  withSentry("/api/video-vision/limits"),
  withAuth,
)(async (ctx) => {
  const result = await getLimitsAndUsage(ctx.userId!);
  return NextResponse.json(result);
});
