/**
 * Feature Flags Admin API
 *
 * V1Plan FASE 2.0.6: CRUD operations for feature flag management
 *
 * GET /api/admin/feature-flags - List all flags
 * GET /api/admin/feature-flags?health=true - Include health/degradation status
 * GET /api/admin/feature-flags?gonogo=true - Include GO/NO-GO checks
 * GET /api/admin/feature-flags?costs=true - Include cost stats and voice sessions
 * POST /api/admin/feature-flags - Update a flag
 * DELETE /api/admin/feature-flags?id=xxx - Activate kill-switch
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin, withAdminReadOnly } from '@/lib/api/middlewares';
import { getAllFlags, isGlobalKillSwitchActive } from '@/lib/feature-flags';
import {
  handleFeaturePolicyMutation,
  handleFeaturePolicyStop,
} from '@/lib/admin/policy-write-actions';
import { getDegradationState, getRecentEvents } from '@/lib/degradation';
import { runGoNoGoChecks, getActiveAlerts, getAllSLOStatuses } from '@/lib/alerting';
import { getCostMetricsSummary, getActiveVoiceSessions, getVoiceLimits } from '@/lib/metrics';

export const revalidate = 0;

/**
 * GET /api/admin/feature-flags
 * Returns all flags with system health status
 */
export const GET = pipe(
  withSentry('/api/admin/feature-flags'),
  withAdminReadOnly,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const includeHealth = searchParams.get('health') === 'true';
  const includeGoNogo = searchParams.get('gonogo') === 'true';
  const includeCosts = searchParams.get('costs') === 'true';

  const flags = getAllFlags();
  const globalKillSwitch = isGlobalKillSwitchActive();

  const response: Record<string, unknown> = {
    flags,
    globalKillSwitch,
    timestamp: new Date().toISOString(),
  };

  if (includeHealth) {
    response.degradation = getDegradationState();
    response.recentEvents = getRecentEvents(10);
    response.activeAlerts = getActiveAlerts();
    response.sloStatuses = getAllSLOStatuses();
  }

  if (includeGoNogo) {
    response.goNoGoResult = runGoNoGoChecks();
  }

  if (includeCosts) {
    response.costStats = await getCostMetricsSummary();
    response.activeVoiceSessions = getActiveVoiceSessions();
    response.voiceLimits = getVoiceLimits();
  }

  return NextResponse.json(response);
});

/**
 * POST /api/admin/feature-flags
 * Update a feature flag or toggle kill-switch
 */
export const POST = pipe(
  withSentry('/api/admin/feature-flags'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  return await handleFeaturePolicyMutation(await ctx.req.json(), ctx.userId!);
});

/**
 * DELETE /api/admin/feature-flags?id=xxx
 * Activate kill-switch for a feature (emergency disable)
 */
export const DELETE = pipe(
  withSentry('/api/admin/feature-flags'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const featureId = searchParams.get('id');
  const reason = searchParams.get('reason') || 'Emergency disable via API';

  if (!featureId) {
    return NextResponse.json({ error: 'Feature ID is required' }, { status: 400 });
  }

  return await handleFeaturePolicyStop(featureId, reason, ctx.userId!);
});
