/**
 * Locale Audit Service
 * Handles audit logging for locale configuration changes
 *
 * Records all CRUD operations on locale configurations including:
 * - Action type (CREATE, UPDATE, DELETE)
 * - Admin user who made the change
 * - Timestamp
 * - Old and new values for updates
 */

import { prisma } from "@/lib/db";
import { LocaleAuditAction } from "@prisma/client";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "locale-audit" });

interface LocaleConfigData {
  id: string;
  countryName: string;
  primaryLocale: string;
  primaryLanguageMaestroId: string;
  secondaryLocales: string[];
  enabled: boolean;
}

/**
 * Log a locale creation event
 */
export async function logLocaleCreate(
  localeId: string,
  adminId: string,
  newData: LocaleConfigData,
  notes?: string
): Promise<void> {
  try {
    await prisma.localeAuditLog.create({
      data: {
        localeId,
        adminId,
        action: "LOCALE_CREATE",
        changes: {
          new: newData,
        } as any,
        notes,
      },
    });

    log.info("Locale created", {
      localeId,
      adminId,
      countryName: newData.countryName,
    });
  } catch (error) {
    log.error("Failed to log locale creation", { localeId, adminId, error });
    // Don't throw - audit logging failure shouldn't block the operation
  }
}

/**
 * Log a locale update event
 */
export async function logLocaleUpdate(
  localeId: string,
  adminId: string,
  oldData: Partial<LocaleConfigData>,
  newData: Partial<LocaleConfigData>,
  notes?: string
): Promise<void> {
  try {
    await prisma.localeAuditLog.create({
      data: {
        localeId,
        adminId,
        action: "LOCALE_UPDATE",
        changes: {
          old: oldData,
          new: newData,
        } as any,
        notes,
      },
    });

    log.info("Locale updated", {
      localeId,
      adminId,
      changedFields: Object.keys(newData),
    });
  } catch (error) {
    log.error("Failed to log locale update", { localeId, adminId, error });
    // Don't throw - audit logging failure shouldn't block the operation
  }
}

/**
 * Log a locale deletion event
 */
export async function logLocaleDelete(
  localeId: string,
  adminId: string,
  deletedData: LocaleConfigData,
  notes?: string
): Promise<void> {
  try {
    await prisma.localeAuditLog.create({
      data: {
        localeId,
        adminId,
        action: "LOCALE_DELETE",
        changes: {
          old: deletedData,
        } as any,
        notes,
      },
    });

    log.info("Locale deleted", {
      localeId,
      adminId,
      countryName: deletedData.countryName,
    });
  } catch (error) {
    log.error("Failed to log locale deletion", { localeId, adminId, error });
    // Don't throw - audit logging failure shouldn't block the operation
  }
}

/**
 * Get audit logs for a specific locale
 */
export async function getLocaleAuditLogs(
  localeId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<
  Array<{
    id: string;
    localeId: string;
    adminId: string;
    action: LocaleAuditAction;
    changes: any;
    notes: string | null;
    createdAt: Date;
  }>
> {
  try {
    const logs = await prisma.localeAuditLog.findMany({
      where: { localeId },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return logs as any;
  } catch (error) {
    log.error("Failed to retrieve audit logs", { localeId, error });
    return [];
  }
}

/**
 * Get audit logs for an admin user
 */
export async function getAdminAuditLogs(
  adminId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<
  Array<{
    id: string;
    localeId: string;
    adminId: string;
    action: LocaleAuditAction;
    changes: any;
    notes: string | null;
    createdAt: Date;
  }>
> {
  try {
    const logs = await prisma.localeAuditLog.findMany({
      where: { adminId },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });

    return logs as any;
  } catch (error) {
    log.error("Failed to retrieve admin audit logs", { adminId, error });
    return [];
  }
}

/**
 * Get all audit logs for a date range
 */
export async function getAuditLogsByDateRange(
  startDate: Date,
  endDate: Date,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<
  Array<{
    id: string;
    localeId: string;
    adminId: string;
    action: LocaleAuditAction;
    changes: any;
    notes: string | null;
    createdAt: Date;
  }>
> {
  try {
    const logs = await prisma.localeAuditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 200,
      skip: options?.offset || 0,
    });

    return logs as any;
  } catch (error) {
    log.error("Failed to retrieve audit logs by date range", {
      startDate,
      endDate,
      error,
    });
    return [];
  }
}
