/**
 * Admin Audit Log Service
 *
 * Logs all admin actions to the AdminAuditLog table for accountability (F-23).
 *
 * INTEGRATION POINTS (do not modify these files in this task):
 * - User CRUD: src/app/api/admin/users/ID/route.ts
 * - User trash: src/app/api/admin/users/trash/route.ts
 * - Invite actions: src/app/api/admin/invites/STAR/route.ts
 * - Character toggles: src/app/api/admin/characters/ID/route.ts
 * - Tier changes: src/app/api/admin/tiers/STAR/route.ts
 * - Settings: src/app/api/admin/settings/route.ts
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const log = logger.child({ module: "admin-audit" });

export interface LogAdminActionParams {
  action: string;
  entityType: string;
  entityId: string;
  adminId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface QueryAuditLogParams {
  action?: string;
  entityType?: string;
  adminId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface QueryAuditLogResult {
  logs: Prisma.AdminAuditLogGetPayload<Record<string, never>>[];
  total: number;
}

/**
 * Logs an admin action to the audit log.
 * Fire-and-forget: does not throw on error, logs instead.
 */
export async function logAdminAction(
  params: LogAdminActionParams,
): Promise<void> {
  const { action, entityType, entityId, adminId, details, ipAddress } = params;

  try {
    await prisma.adminAuditLog.create({
      data: {
        action,
        entityType,
        entityId,
        adminId,
        details: details as Prisma.InputJsonValue,
        ipAddress,
      },
    });

    log.info("Admin action logged", {
      action,
      entityType,
      entityId,
      adminId,
    });
  } catch (error) {
    log.error("Failed to log admin action", {
      action,
      entityType,
      entityId,
      adminId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Fire-and-forget: don't throw, audit failures shouldn't break main flow
  }
}

/**
 * Queries the audit log with filters and pagination.
 * Returns logs ordered by createdAt DESC (most recent first).
 */
export async function queryAuditLog(
  params: QueryAuditLogParams,
): Promise<QueryAuditLogResult> {
  const {
    action,
    entityType,
    adminId,
    from,
    to,
    page = 1,
    pageSize = 50,
  } = params;

  const where: Prisma.AdminAuditLogWhereInput = {};

  if (action) {
    where.action = action;
  }

  if (entityType) {
    where.entityType = entityType;
  }

  if (adminId) {
    where.adminId = adminId;
  }

  if (from || to) {
    where.createdAt = {};
    if (from) {
      where.createdAt.gte = from;
    }
    if (to) {
      where.createdAt.lte = to;
    }
  }

  const skip = (page - 1) * pageSize;

  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Extracts the client IP address from the request headers.
 * Checks x-forwarded-for (preferred) and x-real-ip.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}
