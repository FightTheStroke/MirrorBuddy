/**
 * API Route: Study Kit Upload
 * POST /api/study-kit/upload
 *
 * Upload PDF and start background processing to generate study materials
 * Wave 2: Study Kit Generator
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { processStudyKit } from "@/lib/tools/handlers/study-kit-generators";
import {
  saveMaterialsFromStudyKit,
  indexStudyKitContent,
} from "@/lib/study-kit/sync-materials";
import { UploadStudyKitSchema } from "@/lib/validation/schemas/study-kit";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for processing

/**
 * POST /api/study-kit/upload
 * Upload PDF and generate study kit
 */
export const POST = pipe(
  withSentry("/api/study-kit/upload"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  // Parse form data
  const formData = await ctx.req.formData();
  const file = formData.get("file") as File | null;
  const titleRaw = formData.get("title") as string | null;
  const subjectRaw = formData.get("subject") as string | null;

  // Validate required file
  if (!file) {
    return NextResponse.json(
      { error: "Missing required field: file" },
      { status: 400 },
    );
  }

  // Validate file type
  if (!file.type.includes("pdf")) {
    return NextResponse.json(
      { error: "Only PDF files are supported" },
      { status: 400 },
    );
  }

  // Validate file size (max 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File size must be less than 10MB" },
      { status: 400 },
    );
  }

  // Validate title and subject using schema
  const validation = UploadStudyKitSchema.safeParse({
    title: titleRaw,
    subject: subjectRaw || undefined,
  });

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validation.error.format() },
      { status: 400 },
    );
  }

  const { title, subject } = validation.data;

  logger.info("Processing study kit upload", {
    userId,
    filename: file.name,
    size: file.size,
    title,
    subject,
  });

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Create initial study kit record (processing state)
  const studyKit = await prisma.studyKit.create({
    data: {
      userId,
      sourceFile: file.name,
      title,
      subject,
      status: "processing",
    },
  });

  // Process in background (for production, use a queue like BullMQ)
  // Wrapped in async IIFE to ensure all errors (sync and async) are caught
  (async () => {
    try {
      const result = await processStudyKit(
        buffer,
        title,
        subject,
        (step, progress) => {
          logger.debug("Study kit progress", {
            studyKitId: studyKit.id,
            step,
            progress,
          });
        },
        userId,
      );

      // Update study kit with generated materials
      const updatedKit = await prisma.studyKit.update({
        where: { id: studyKit.id },
        data: {
          status: "ready",
          summary: result.summary,
          mindmap: result.mindmap ? JSON.stringify(result.mindmap) : null,
          demo: result.demo ? JSON.stringify(result.demo) : null,
          quiz: result.quiz ? JSON.stringify(result.quiz) : null,
          originalText: result.originalText,
          pageCount: result.pageCount,
          wordCount: result.wordCount,
        },
      });

      // Sync materials to archive (Phase 1 - T-02)
      await saveMaterialsFromStudyKit(userId, updatedKit);

      // Index original text for RAG retrieval
      await indexStudyKitContent(userId, {
        ...updatedKit,
        originalText: result.originalText,
      });

      logger.info("Study kit processing complete", {
        studyKitId: studyKit.id,
      });
    } catch (error) {
      // Capture to Sentry for visibility
      Sentry.captureException(error, {
        tags: { api: "study-kit-upload", phase: "processing" },
        extra: { studyKitId: studyKit.id },
      });

      // Update with error status - guaranteed to run for any error
      await prisma.studyKit.update({
        where: { id: studyKit.id },
        data: {
          status: "error",
          errorMessage: String(error),
        },
      });

      logger.error("Study kit processing failed", {
        studyKitId: studyKit.id,
        error: String(error),
      });
    }
  })();

  // Return immediately with processing status
  return NextResponse.json({
    success: true,
    studyKitId: studyKit.id,
    status: "processing",
    message: "Study kit is being processed. This may take a few minutes.",
  });
});
