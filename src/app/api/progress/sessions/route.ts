// ============================================================================
// API ROUTE: Study sessions
// GET: Get recent sessions
// POST: Create new session
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  SessionsGetQuerySchema,
  SessionsPostSchema,
  SessionsPatchSchema,
} from "@/lib/validation/schemas/progress";

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const { searchParams } = new URL(request.url);
    const rawLimit = searchParams.get("limit");
    const rawMaestroId = searchParams.get("maestroId");

    // Validate query parameters
    const validation = SessionsGetQuerySchema.safeParse({
      limit: rawLimit ? parseInt(rawLimit) : undefined,
      maestroId: rawMaestroId || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 },
      );
    }

    const { limit, maestroId } = validation.data;

    const sessions = await prisma.studySession.findMany({
      where: {
        userId,
        ...(maestroId && { maestroId }),
      },
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    return NextResponse.json(sessions);
  } catch (error) {
    logger.error("Sessions GET error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to get sessions" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  // CSRF protection
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const body = await request.json();

    // Validate request body
    const validation = SessionsPostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid session data",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    const session = await prisma.studySession.create({
      data: {
        userId,
        maestroId: data.maestroId,
        subject: data.subject,
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    logger.error("Sessions POST error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}

// PATCH to end a session
export async function PATCH(request: NextRequest) {
  // CSRF protection
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const body = await request.json();

    // Validate request body
    const validation = SessionsPatchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid session update data",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Verify session belongs to user
    const existingSession = await prisma.studySession.findFirst({
      where: { id: data.id, userId },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const session = await prisma.studySession.update({
      where: { id: data.id },
      data: {
        endedAt: new Date(),
        duration: data.duration,
        xpEarned: data.xpEarned,
        questions: data.questions,
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    logger.error("Sessions PATCH error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 },
    );
  }
}
