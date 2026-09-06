/**
 * Funnel Event Tracking API
 * Records user journey through conversion funnel stages
 * Plan 069 - Conversion Funnel Dashboard
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';
import { recordFunnelEvent, type FunnelStage } from '@/lib/funnel';
import { logger } from '@/lib/logger';
import { getVisitorIdFromCookie } from '@/lib/trial/visitor-id';
import { z } from 'zod';
import { safeReadJson } from '@/lib/api/safe-json';
import {
  canCollectOptionalAnalytics,
  optionalAnalyticsDenied,
} from '@/lib/telemetry/optional-analytics-server';

export const revalidate = 0;
const log = logger.child({ module: 'api/funnel/track' });

const VALID_STAGES: FunnelStage[] = [
  'VISITOR',
  'TRIAL_START',
  'TRIAL_ENGAGED',
  'LIMIT_HIT',
  'BETA_REQUEST',
  'APPROVED',
  'FIRST_LOGIN',
  'ACTIVE',
  'CHURNED',
];

const stageSchema = z.custom<FunnelStage>(
  (value) => typeof value === 'string' && VALID_STAGES.some((stage) => stage === value),
);
const trackSchema = z.object({
  stage: stageSchema,
  fromStage: stageSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const POST = pipe(
  withSentry('/api/funnel/track'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  if (!(await canCollectOptionalAnalytics(ctx.userId))) return optionalAnalyticsDenied();
  const parsed = trackSchema.safeParse(await safeReadJson(ctx.req));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid funnel event' }, { status: 400 });
  const { stage, fromStage, metadata } = parsed.data;

  // Validate stage
  if (!stage || !VALID_STAGES.includes(stage)) {
    return NextResponse.json(
      { error: 'Invalid stage', validStages: VALID_STAGES },
      { status: 400 },
    );
  }

  // Get visitor ID from cookie
  const visitorId = getVisitorIdFromCookie(ctx.req);

  // Record the funnel event
  const stored = await recordFunnelEvent({
    visitorId: visitorId ?? undefined,
    userId: ctx.userId,
    stage,
    fromStage,
    metadata: {
      ...metadata,
      userAgent: ctx.req.headers.get('user-agent') || undefined,
      referrer: ctx.req.headers.get('referer') || undefined,
    },
  });

  if (!stored) return optionalAnalyticsDenied();
  log.info('Funnel event recorded', { stage, fromStage });

  return NextResponse.json({ success: true, stored: true, stage });
});
