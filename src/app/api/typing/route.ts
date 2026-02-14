/**
 * API Route: Typing Progress
 * GET /api/typing?userId={userId} - Get typing progress
 * POST /api/typing - Save typing progress
 * PATCH /api/typing - Update partial progress
 */

import { NextResponse } from "next/server";
import type { TypingProgress } from "@/types/tools";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/typing"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const searchParams = ctx.req.nextUrl.searchParams;
  const requestedUserId = searchParams.get("userId");

  if (requestedUserId && requestedUserId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const progress = await getTypingProgress(userId);

  if (!progress) {
    return NextResponse.json({
      success: true,
      data: null,
    });
  }

  return NextResponse.json({
    success: true,
    data: progress,
  });
});

export const POST = pipe(
  withSentry("/api/typing"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body: TypingProgress & { userId?: string } = await ctx.req.json();

  if (body.userId && body.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const progress = {
    ...body,
    userId,
  };

  await saveTypingProgress(progress);

  return NextResponse.json({
    success: true,
    message: "Typing progress saved",
  });
});

export const PATCH = pipe(
  withSentry("/api/typing"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body: Partial<TypingProgress> & { userId?: string } =
    await ctx.req.json();

  if (body.userId && body.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existingProgress = await getTypingProgress(userId);
  if (!existingProgress) {
    return NextResponse.json({ error: "Progress not found" }, { status: 404 });
  }

  const updatedProgress = {
    ...existingProgress,
    ...body,
  };

  await saveTypingProgress(updatedProgress);

  return NextResponse.json({
    success: true,
    message: "Typing progress updated",
  });
});

async function getTypingProgress(
  _userId: string,
): Promise<TypingProgress | null> {
  // Stub: returns null until TypingProgress schema is added to Prisma
  return null;
}

async function saveTypingProgress(_progress: TypingProgress): Promise<void> {
  // Stub: no-op until TypingProgress schema is added to Prisma
}
