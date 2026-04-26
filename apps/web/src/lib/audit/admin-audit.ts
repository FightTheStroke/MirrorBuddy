/**
 * @file admin-audit.ts
 * @brief Structured audit logging for admin actions
 * SOC 2 CC6.1 compliant audit trail with 365-day retention
 * Created for F-11: SOC 2 Type II Readiness
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "audit" });

export type AuditAction =
  | "user.create"
  | "user.update"
  | "user.delete"
  | "user.role_change"
  | "tier.change"
  | "sso.config_create"
  | "sso.config_update"
  | "sso.config_delete"
  | "sso.directory_sync"
  | "data.export"
  | "data.delete"
  | "auth.login"
  | "auth.logout"
  | "auth.sso_login";

export interface AuditEntry {
  action: AuditAction;
  actorId: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function recordAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId,
        targetId: entry.targetId,
        targetType: entry.targetType,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        ipAddress: entry.ipAddress,
      },
    });

    log.info("Audit event recorded", {
      action: entry.action,
      actorId: entry.actorId,
      targetId: entry.targetId,
    });
  } catch (error) {
    log.error("Failed to record audit event", {
      action: entry.action,
      error,
    });
  }
}

export interface AuditLogQuery {
  action?: AuditAction;
  actorId?: string;
  targetId?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  pageSize?: number;
}

export async function queryAuditLogs(query: AuditLogQuery) {
  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 50, 200);

  const where: Record<string, unknown> = {};
  if (query.action) where.action = query.action;
  if (query.actorId) where.actorId = query.actorId;
  if (query.targetId) where.targetId = query.targetId;
  if (query.fromDate || query.toDate) {
    where.createdAt = {
      ...(query.fromDate && { gte: query.fromDate }),
      ...(query.toDate && { lte: query.toDate }),
    };
  }

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { entries, total, page, pageSize };
}
