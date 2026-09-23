/**
 * PII Decrypt Audit Logger
 *
 * Logs every PII decryption to ComplianceAuditEntry table for regulatory compliance.
 * Part of L.132 Art.4 audit trail requirements (F-08).
 *
 * @module security/decrypt-audit
 */

import { waitUntil } from '@vercel/functions';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'decrypt-audit' });

// Lazy-load prisma to avoid circular dependency
let prismaPromise: Promise<typeof import('@/lib/db')> | null = null;
async function getPrisma() {
  if (!prismaPromise) {
    prismaPromise = import('@/lib/db');
  }
  const dbModule = await prismaPromise;
  return dbModule.prisma;
}

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

function toAuditRow({ model, field, userId, adminId, ipAddress, context }: DecryptAuditContext) {
  return {
    userId: userId || null,
    adminId: adminId || null,
    eventType: 'data_access',
    severity: 'info',
    description: `PII field decrypted: ${model}.${field}`,
    details: JSON.stringify({
      model,
      field,
      accessedAt: new Date().toISOString(),
      accessor: adminId || userId || 'system',
      ...(context || {}),
    }),
    ipAddress: ipAddress || null,
  };
}

/**
 * Run the audit write without blocking the response, but inside the request
 * lifetime: a detached promise is frozen when Vercel suspends the instance, and
 * the write then times out on resume (#1170). Failures stay visible as errors.
 */
function recordAudit(entries: DecryptAuditContext[], write: () => Promise<unknown>): void {
  const pending = (async () => {
    try {
      await write();
      log.debug('PII decrypt access logged', { entries: entries.length });
    } catch (error) {
      // Audit failures must not break the main flow, but must never be silent.
      log.error('Failed to log PII decrypt access', {
        entries: entries.length,
        fields: entries.map(({ model, field }) => `${model}.${field}`),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();
  waitUntil(pending);
}

/**
 * Log PII decryption access to compliance audit table.
 *
 * Non-blocking: does not throw on error, logs instead.
 *
 * @param auditContext - Context about the decryption operation
 */
export function logDecryptAccess(auditContext: DecryptAuditContext): void {
  recordAudit([auditContext], async () => {
    const prisma = await getPrisma();
    await prisma.complianceAuditEntry.create({ data: toAuditRow(auditContext) });
  });
}

/**
 * Log every decryption performed by one query in a single insert, so reading
 * N records costs one audit statement instead of N (#1160).
 */
export function logDecryptAccessBatch(entries: DecryptAuditContext[]): void {
  if (!Array.isArray(entries) || entries.length === 0) return;
  recordAudit(entries, async () => {
    const prisma = await getPrisma();
    await prisma.complianceAuditEntry.createMany({ data: entries.map(toAuditRow) });
  });
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
