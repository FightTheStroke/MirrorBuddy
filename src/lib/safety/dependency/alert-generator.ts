/**
 * Alert Generator
 * Reference: Amodei "The Adolescence of Technology" (2026)
 */

import { prisma } from "@/lib/db";
import { DependencyAlertInput, AlertType, AlertSeverity } from "./types";

export async function createAlert(
  input: DependencyAlertInput,
): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingAlert = await prisma.dependencyAlert.findFirst({
    where: {
      userId: input.userId,
      alertType: input.alertType,
      createdAt: { gte: today },
      resolved: false,
    },
  });

  if (existingAlert) {
    const severityOrder = { warning: 1, concern: 2, critical: 3 };
    const existingSeverity =
      severityOrder[existingAlert.severity as AlertSeverity];
    const newSeverity = severityOrder[input.severity];

    if (newSeverity > existingSeverity) {
      await prisma.dependencyAlert.update({
        where: { id: existingAlert.id },
        data: {
          severity: input.severity,
          sigmaDeviation: input.sigmaDeviation,
          triggerValue: input.triggerValue,
          threshold: input.threshold,
          description: input.description,
          details: input.details as object,
        },
      });
    }
    return existingAlert.id;
  }

  const alert = await prisma.dependencyAlert.create({
    data: {
      userId: input.userId,
      alertType: input.alertType,
      severity: input.severity,
      sigmaDeviation: input.sigmaDeviation,
      triggerValue: input.triggerValue,
      threshold: input.threshold,
      description: input.description,
      details: input.details as object,
    },
  });

  return alert.id;
}

export async function getUnresolvedAlerts(userId: string): Promise<
  Array<{
    id: string;
    alertType: AlertType;
    severity: AlertSeverity;
    description: string | null;
    createdAt: Date;
  }>
> {
  const alerts = await prisma.dependencyAlert.findMany({
    where: { userId, resolved: false },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      alertType: true,
      severity: true,
      description: true,
      createdAt: true,
    },
  });

  return alerts as Array<{
    id: string;
    alertType: AlertType;
    severity: AlertSeverity;
    description: string | null;
    createdAt: Date;
  }>;
}

export async function resolveAlert(
  alertId: string,
  resolvedBy: string,
  resolution: string,
): Promise<void> {
  await prisma.dependencyAlert.update({
    where: { id: alertId },
    data: { resolved: true, resolvedAt: new Date(), resolvedBy, resolution },
  });
}

export async function markParentNotified(alertId: string): Promise<void> {
  await prisma.dependencyAlert.update({
    where: { id: alertId },
    data: { parentNotified: true, parentNotifiedAt: new Date() },
  });
}

export async function getAlertsForParentNotification(): Promise<
  Array<{
    id: string;
    userId: string;
    alertType: string;
    severity: string;
    description: string | null;
  }>
> {
  return prisma.dependencyAlert.findMany({
    where: {
      parentNotified: false,
      resolved: false,
      severity: { in: ["concern", "critical"] },
    },
    select: {
      id: true,
      userId: true,
      alertType: true,
      severity: true,
      description: true,
    },
  });
}

export async function getAlertStatistics(): Promise<{
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  unresolvedCount: number;
}> {
  const [total, bySeverity, byType, unresolvedCount] = await Promise.all([
    prisma.dependencyAlert.count(),
    prisma.dependencyAlert.groupBy({ by: ["severity"], _count: true }),
    prisma.dependencyAlert.groupBy({ by: ["alertType"], _count: true }),
    prisma.dependencyAlert.count({ where: { resolved: false } }),
  ]);

  return {
    total,
    bySeverity: Object.fromEntries(
      bySeverity.map((s) => [s.severity, s._count]),
    ),
    byType: Object.fromEntries(byType.map((t) => [t.alertType, t._count])),
    unresolvedCount,
  };
}
