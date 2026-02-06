/**
 * PII Decrypt Audit Logger
 *
 * Logs every PII decryption to ComplianceAuditEntry table for regulatory compliance.
 * Part of L.132 Art.4 audit trail requirements (F-08).
 *
 * @module security/decrypt-audit
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "decrypt-audit" });

export interface DecryptAuditContext {
  /**
   * Prisma model being accessed (e.g., "User", "Profile")
   */
  model: string;

  /**
   * Field being decrypted (e.g., "email", "name")
   */
  field: string;

  /**
   * User ID making the access (if available)
   */
  userId?: string;

  /**
   * Admin ID if this is an admin access
   */
  adminId?: string;

  /**
   * IP address of the requester (if available)
   */
  ipAddress?: string;

  /**
   * Additional context (e.g., API endpoint, operation type)
   */
  context?: Record<string, unknown>;
}

/**
 * Log PII decryption access to compliance audit table.
 *
 * Fire-and-forget: does not throw on error, logs instead.
 * Uses async execution without await for performance.
 *
 * @param auditContext - Context about the decryption operation
 */
export function logDecryptAccess(auditContext: DecryptAuditContext): void {
  const { model, field, userId, adminId, ipAddress, context } = auditContext;

  // Fire-and-forget: execute async but don't await
  void (async () => {
    try {
      await prisma.complianceAuditEntry.create({
        data: {
          userId: userId || null,
          adminId: adminId || null,
          eventType: "data_access",
          severity: "info",
          description: `PII field decrypted: ${model}.${field}`,
          details: JSON.stringify({
            model,
            field,
            accessedAt: new Date().toISOString(),
            accessor: userId || adminId || "system",
            ...(context || {}),
          }),
          ipAddress: ipAddress || null,
        },
      });

      log.debug("PII decrypt access logged", {
        model,
        field,
        userId: userId?.slice(0, 8),
        adminId: adminId?.slice(0, 8),
      });
    } catch (error) {
      // Fire-and-forget: don't throw, audit failures shouldn't break main flow
      log.error("Failed to log PII decrypt access", {
        model,
        field,
        userId: userId?.slice(0, 8),
        adminId: adminId?.slice(0, 8),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();
}

/**
 * Log bulk decryption access (for array results).
 *
 * @param model - Prisma model name
 * @param field - Field being decrypted
 * @param count - Number of records decrypted
 * @param userId - User ID making the access
 * @param adminId - Admin ID if admin access
 */
export function logBulkDecryptAccess(
  model: string,
  field: string,
  count: number,
  userId?: string,
  adminId?: string,
): void {
  logDecryptAccess({
    model,
    field,
    userId,
    adminId,
    context: {
      bulkOperation: true,
      recordCount: count,
    },
  });
}
