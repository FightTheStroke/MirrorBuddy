// ============================================================================
// API ROUTE: Study sessions
// GET: Get recent sessions
// POST: Create new session
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  SessionsGetQuerySchema,
  SessionsPostSchema,
  SessionsPatchSchema,
} from '@/lib/validation/schemas/progress';
import { pipe, withSentry, withAuth, withCSRF } from '@/lib/api/middlewares';
import { safeReadJson } from '@/lib/api/safe-json';


export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/progress/sessions'),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const { searchParams } = new URL(ctx.req.url);
  const rawLimit = searchParams.get('limit');
  const rawMaestroId = searchParams.get('maestroId');

  // Validate query parameters
  const validation = SessionsGetQuerySchema.safeParse({
    limit: rawLimit ? parseInt(rawLimit) : undefined,
    maestroId: rawMaestroId || undefined,
  });

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
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
    orderBy: { startedAt: 'desc' },
    take: limit,
  });

  return NextResponse.json(sessions);
});

export const POST = pipe(
  withSentry('/api/progress/sessions'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body = await safeReadJson(ctx.req);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate request body
  const validation = SessionsPostSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid session data',
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
});

// PATCH to end a session
export const PATCH = pipe(
  withSentry('/api/progress/sessions'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body = await safeReadJson(ctx.req);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate request body
  const validation = SessionsPatchSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid session update data',
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
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
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
});
