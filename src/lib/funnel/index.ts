/**
 * Funnel Event Tracking
 * Records user journey through conversion funnel stages
 * Plan 069 - Conversion Funnel Dashboard
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const FUNNEL_STAGES = [
  "VISITOR",
  "TRIAL_START",
  "TRIAL_ENGAGED",
  "LIMIT_HIT",
  "BETA_REQUEST",
  "APPROVED",
  "FIRST_LOGIN",
  "ACTIVE",
  "CHURNED",
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number];

interface RecordFunnelEventParams {
  visitorId?: string;
  userId?: string;
  stage: FunnelStage;
  fromStage?: FunnelStage;
  metadata?: Record<string, unknown>;
  isTestData?: boolean;
}

/**
 * Record a funnel event
 * At least one of visitorId or userId must be provided
 */
export async function recordFunnelEvent({
  visitorId,
  userId,
  stage,
  fromStage,
  metadata,
  isTestData = false,
}: RecordFunnelEventParams): Promise<void> {
  if (!visitorId && !userId) {
    throw new Error("Either visitorId or userId must be provided");
  }

  // Detect test data from identifier patterns (ADR 0065)
  const detectedTestData =
    isTestData ||
    (visitorId?.startsWith("e2e-test-") ?? false) ||
    (userId?.startsWith("e2e-test-") ?? false);

  await prisma.funnelEvent.create({
    data: {
      visitorId,
      userId,
      stage,
      fromStage,
      metadata: metadata as Prisma.InputJsonValue | undefined,
      isTestData: detectedTestData,
    },
  });
}

/**
 * Get the latest funnel stage for a visitor/user
 */
export async function getLatestStage(identifier: {
  visitorId?: string;
  userId?: string;
}): Promise<FunnelStage | null> {
  const where = identifier.userId
    ? { userId: identifier.userId }
    : { visitorId: identifier.visitorId };

  const latest = await prisma.funnelEvent.findFirst({
    where,
    orderBy: { createdAt: "desc" },
    select: { stage: true },
  });

  return (latest?.stage as FunnelStage) ?? null;
}

/**
 * Record stage transition with automatic fromStage detection
 */
export async function recordStageTransition(
  identifier: { visitorId?: string; userId?: string },
  toStage: FunnelStage,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const fromStage = await getLatestStage(identifier);

  await recordFunnelEvent({
    ...identifier,
    stage: toStage,
    fromStage: fromStage ?? undefined,
    metadata,
  });
}

/**
 * Get full funnel journey for a user/visitor
 */
export async function getFunnelJourney(identifier: {
  visitorId?: string;
  userId?: string;
}): Promise<Array<{ stage: FunnelStage; createdAt: Date; metadata: unknown }>> {
  const where = identifier.userId
    ? { userId: identifier.userId }
    : { visitorId: identifier.visitorId };

  const events = await prisma.funnelEvent.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      stage: true,
      createdAt: true,
      metadata: true,
    },
  });

  return events.map((e) => ({
    stage: e.stage as FunnelStage,
    createdAt: e.createdAt,
    metadata: e.metadata,
  }));
}
