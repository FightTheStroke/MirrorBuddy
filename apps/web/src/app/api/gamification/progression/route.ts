/**
 * API Route: Gamification Progression
 * GET /api/gamification/progression
 */

import { NextResponse } from "next/server";
import { getProgression } from "@/lib/gamification/db";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/gamification/progression"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const progression = await getProgression(userId);

  return NextResponse.json({
    success: true,
    ...progression,
  });
});
