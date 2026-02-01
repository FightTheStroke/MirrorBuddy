/**
 * Compliance Audit Log API (F-08)
 *
 * Endpoint for regulatory inspectors to retrieve audit logs.
 * Italian L.132 Art.3 - Compliance reporting
 *
 * GET /api/compliance/audit-log
 * Query params:
 *   - from: ISO date (required)
 *   - to: ISO date (required)
 *   - type: event type filter (optional)
 *   - severity: severity filter (optional)
 *   - page: pagination (default 1)
 *   - limit: page size (default 50, max 100)
 *
 * Response:
 * {
 *   data: ComplianceAuditEntry[],
 *   pagination: { page, limit, total, hasMore },
 *   exportedAt: ISO timestamp
 * }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";

interface ComplianceAuditEntryResponse {
  id: string;
  eventType: string;
  severity: string;
  description: string;
  details: string | null;
  userId: string | null;
  adminId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

interface AuditLogResponse {
  data: ComplianceAuditEntryResponse[];
  pagination: PaginationInfo;
  exportedAt: string;
}

/**
 * GET /api/compliance/audit-log
 * Retrieve paginated compliance audit entries with filtering
 */
export const GET = pipe(
  withSentry("/api/compliance/audit-log"),
  withAdmin,
)(async (ctx): Promise<Response> => {
  try {
    // Extract and validate query parameters
    const { searchParams } = new URL(ctx.req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const typeFilter = searchParams.get("type");
    const severityFilter = searchParams.get("severity");
    const pageParam = searchParams.get("page") || "1";
    const limitParam = searchParams.get("limit") || "50";

    // Validate required date parameters
    if (!fromParam || !toParam) {
      return NextResponse.json(
        { error: "Missing required parameters: from and to dates" },
        { status: 400 },
      );
    }

    // Parse and validate dates
    let fromDate: Date;
    let toDate: Date;
    try {
      fromDate = new Date(fromParam);
      toDate = new Date(toParam);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new Error("Invalid date format");
      }

      if (fromDate > toDate) {
        return NextResponse.json(
          { error: "Invalid date range: from date must be before to date" },
          { status: 400 },
        );
      }
    } catch (_error) {
      return NextResponse.json(
        {
          error:
            "Invalid date format. Use ISO 8601 format (e.g., 2025-01-20T00:00:00Z)",
        },
        { status: 400 },
      );
    }

    // Parse pagination parameters
    let page: number;
    let limit: number;
    try {
      page = Math.max(1, parseInt(pageParam, 10));
      limit = Math.min(100, Math.max(1, parseInt(limitParam, 10)));
    } catch {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 },
      );
    }

    // Build filter conditions
    const where: Record<string, unknown> = {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (typeFilter) {
      where.eventType = typeFilter;
    }

    if (severityFilter) {
      where.severity = severityFilter;
    }

    // Query audit entries with pagination
    const [entries, total] = await Promise.all([
      prisma.complianceAuditEntry.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          eventType: true,
          severity: true,
          description: true,
          details: true,
          userId: true,
          adminId: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
        },
      }),
      prisma.complianceAuditEntry.count({ where }),
    ]);

    // Format response
    const response: AuditLogResponse = {
      data: entries.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
      exportedAt: new Date().toISOString(),
    };

    // Log access for compliance trail
    logger.info("Audit log retrieved", {
      adminId: ctx.userId,
      dateRange: { from: fromParam, to: toParam },
      filters: {
        type: typeFilter,
        severity: severityFilter,
      },
      resultsCount: entries.length,
      totalCount: total,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Audit log retrieval failed", {}, error as Error);
    return NextResponse.json(
      { error: "Failed to retrieve audit log" },
      { status: 500 },
    );
  }
});
