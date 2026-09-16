/**
 * API Route: Safety Events
 *
 * POST /api/safety/events
 *
 * Persists safety events to database for compliance tracking.
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF } from '@/lib/api/middlewares';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { validateAuth } from '@/lib/auth/server';
import { triggerAdminCountsUpdate } from '@/lib/helpers/publish-admin-counts';
import { SAFETY_EVENT_TYPES } from '@/lib/safety';

export const revalidate = 0;
const SafetyEventSchema = z.object({
  type: z.enum(SAFETY_EVENT_TYPES),
  severity: z.enum(['info', 'warning', 'alert', 'critical']),
  sessionId: z.string().optional(),
  category: z.string().optional(),
});

export const POST = pipe(
  withSentry('/api/safety/events'),
  withCSRF,
)(async (ctx) => {
  const auth = await validateAuth();
  const userId = auth.authenticated && auth.userId ? auth.userId : null;

  const parsed = SafetyEventSchema.safeParse(await ctx.req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid safety event' }, { status: 400 });
  }
  const { type, severity, sessionId, category } = parsed.data;

  await prisma.safetyEvent.create({
    data: {
      userId: userId ?? null,
      type,
      severity,
      conversationId: sessionId ?? null,
      resolvedBy: null,
      resolvedAt: null,
      resolution: category ?? null,
    },
  });

  // Trigger admin counts push (F-32: non-blocking, rate-limited per event type)
  triggerAdminCountsUpdate('safety');

  return NextResponse.json({ success: true });
});
