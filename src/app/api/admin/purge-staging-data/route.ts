/**
 * Admin Purge Staging Data API
 * F-05 - Delete all records marked with isTestData=true
 *
 * GET: Preview counts of records to be deleted
 * DELETE: Execute purge and log the action
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "purge-staging-data-api" });

export interface StagingDataCounts {
  users: number;
  conversations: number;
  messages: number;
  flashcardProgress: number;
  quizResults: number;
  materials: number;
  sessionMetrics: number;
  userActivity: number;
  telemetryEvents: number;
  studySessions: number;
  funnelEvents: number;
  total: number;
}

/**
 * GET: Preview counts of staging data records
 */
export async function GET(
  _request: NextRequest,
): Promise<NextResponse<StagingDataCounts | { error: string }>> {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Count all records with isTestData=true
    const [
      users,
      conversations,
      messages,
      flashcardProgress,
      quizResults,
      materials,
      sessionMetrics,
      userActivity,
      telemetryEvents,
      studySessions,
      funnelEvents,
    ] = await Promise.all([
      prisma.user.count({ where: { isTestData: true } }),
      prisma.conversation.count({ where: { isTestData: true } }),
      prisma.message.count({ where: { isTestData: true } }),
      prisma.flashcardProgress.count({ where: { isTestData: true } }),
      prisma.quizResult.count({ where: { isTestData: true } }),
      prisma.material.count({ where: { isTestData: true } }),
      prisma.sessionMetrics.count({ where: { isTestData: true } }),
      prisma.userActivity.count({ where: { isTestData: true } }),
      prisma.telemetryEvent.count({ where: { isTestData: true } }),
      prisma.studySession.count({ where: { isTestData: true } }),
      prisma.funnelEvent.count({ where: { isTestData: true } }),
    ]);

    const total =
      users +
      conversations +
      messages +
      flashcardProgress +
      quizResults +
      materials +
      sessionMetrics +
      userActivity +
      telemetryEvents +
      studySessions +
      funnelEvents;

    log.info("Staging data counts retrieved", {
      total,
      adminId: auth.userId,
    });

    return NextResponse.json({
      users,
      conversations,
      messages,
      flashcardProgress,
      quizResults,
      materials,
      sessionMetrics,
      userActivity,
      telemetryEvents,
      studySessions,
      funnelEvents,
      total,
    });
  } catch (error) {
    log.error("Failed to count staging data", undefined, error);
    return NextResponse.json(
      { error: "Failed to count staging data" },
      { status: 500 },
    );
  }
}

/**
 * DELETE: Purge all staging data records
 */
export async function DELETE(
  request: NextRequest,
): Promise<
  NextResponse<{ success: boolean; deleted: number } | { error: string }>
> {
  // CSRF protection
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Count records before deletion (for audit log)
    const [
      users,
      conversations,
      messages,
      flashcardProgress,
      quizResults,
      materials,
      sessionMetrics,
      userActivity,
      telemetryEvents,
      studySessions,
      funnelEvents,
    ] = await Promise.all([
      prisma.user.count({ where: { isTestData: true } }),
      prisma.conversation.count({ where: { isTestData: true } }),
      prisma.message.count({ where: { isTestData: true } }),
      prisma.flashcardProgress.count({ where: { isTestData: true } }),
      prisma.quizResult.count({ where: { isTestData: true } }),
      prisma.material.count({ where: { isTestData: true } }),
      prisma.sessionMetrics.count({ where: { isTestData: true } }),
      prisma.userActivity.count({ where: { isTestData: true } }),
      prisma.telemetryEvent.count({ where: { isTestData: true } }),
      prisma.studySession.count({ where: { isTestData: true } }),
      prisma.funnelEvent.count({ where: { isTestData: true } }),
    ]);

    const totalToDelete =
      users +
      conversations +
      messages +
      flashcardProgress +
      quizResults +
      materials +
      sessionMetrics +
      userActivity +
      telemetryEvents +
      studySessions +
      funnelEvents;

    // Delete in transaction (children first to avoid FK constraints)
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete children first
      await tx.message.deleteMany({ where: { isTestData: true } });
      await tx.flashcardProgress.deleteMany({ where: { isTestData: true } });
      await tx.quizResult.deleteMany({ where: { isTestData: true } });
      await tx.material.deleteMany({ where: { isTestData: true } });
      await tx.sessionMetrics.deleteMany({ where: { isTestData: true } });
      await tx.userActivity.deleteMany({ where: { isTestData: true } });
      await tx.telemetryEvent.deleteMany({ where: { isTestData: true } });
      await tx.studySession.deleteMany({ where: { isTestData: true } });
      await tx.funnelEvent.deleteMany({ where: { isTestData: true } });
      await tx.conversation.deleteMany({ where: { isTestData: true } });

      // Delete users last (parent records)
      await tx.user.deleteMany({ where: { isTestData: true } });
    });

    // Log the action in compliance audit log
    await prisma.complianceAuditEntry.create({
      data: {
        eventType: "admin_action",
        severity: "info",
        description: `Purged staging data: ${totalToDelete} records deleted`,
        details: JSON.stringify({
          breakdown: {
            users,
            conversations,
            messages,
            flashcardProgress,
            quizResults,
            materials,
            sessionMetrics,
            userActivity,
            telemetryEvents,
            studySessions,
            funnelEvents,
          },
          total: totalToDelete,
          timestamp: new Date().toISOString(),
        }),
        adminId: auth.userId,
      },
    });

    log.info("Staging data purged successfully", {
      deleted: totalToDelete,
      adminId: auth.userId,
    });

    return NextResponse.json({
      success: true,
      deleted: totalToDelete,
    });
  } catch (error) {
    log.error("Failed to purge staging data", undefined, error);
    return NextResponse.json(
      { error: "Failed to purge staging data" },
      { status: 500 },
    );
  }
}
