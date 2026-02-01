/**
 * API Route: Study Kit by ID
 * GET /api/study-kit/[id]
 *
 * Get study kit status and generated materials
 * Wave 2: Study Kit Generator
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { StudyKit } from "@/types/study-kit";
import { deleteMaterialsFromStudyKit } from "@/lib/study-kit/sync-materials";

/**
 * GET /api/study-kit/[id]
 * Get study kit by ID
 */
export const GET = pipe(
  withSentry("/api/study-kit/[id]"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { id } = await ctx.params;

  // Get study kit
  const studyKit = await prisma.studyKit.findUnique({
    where: { id },
  });

  if (!studyKit) {
    return NextResponse.json({ error: "Study kit not found" }, { status: 404 });
  }

  // Verify ownership
  if (studyKit.userId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Parse JSON fields
  const response: StudyKit = {
    id: studyKit.id,
    userId: studyKit.userId,
    sourceFile: studyKit.sourceFile,
    title: studyKit.title,
    summary: studyKit.summary || undefined,
    mindmap: studyKit.mindmap ? JSON.parse(studyKit.mindmap) : undefined,
    demo: studyKit.demo ? JSON.parse(studyKit.demo) : undefined,
    quiz: studyKit.quiz ? JSON.parse(studyKit.quiz) : undefined,
    status: studyKit.status as "processing" | "ready" | "error",
    errorMessage: studyKit.errorMessage || undefined,
    subject: studyKit.subject || undefined,
    pageCount: studyKit.pageCount || undefined,
    wordCount: studyKit.wordCount || undefined,
    createdAt: studyKit.createdAt,
    updatedAt: studyKit.updatedAt,
  };

  return NextResponse.json({
    success: true,
    studyKit: response,
  });
});

/**
 * DELETE /api/study-kit/[id]
 * Delete a study kit
 */
export const DELETE = pipe(
  withSentry("/api/study-kit/[id]"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { id } = await ctx.params;

  // Get study kit to verify ownership
  const studyKit = await prisma.studyKit.findUnique({
    where: { id },
  });

  if (!studyKit) {
    return NextResponse.json({ error: "Study kit not found" }, { status: 404 });
  }

  if (studyKit.userId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Delete related materials first (Phase 1 - T-03)
  await deleteMaterialsFromStudyKit(id);

  // Delete study kit
  await prisma.studyKit.delete({
    where: { id },
  });

  logger.info("Study kit deleted", { studyKitId: id, userId });

  return NextResponse.json({
    success: true,
    message: "Study kit deleted",
  });
});
