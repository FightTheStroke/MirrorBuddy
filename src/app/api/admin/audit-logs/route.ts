import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/audit-logs
 * List audit logs with filters and pagination
 * Query params: action, userId, adminId, startDate, endDate, page, pageSize
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const adminId = searchParams.get("adminId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Validate pagination parameters
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const rawPageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const pageSize =
      Number.isNaN(rawPageSize) || rawPageSize < 1
        ? 50
        : rawPageSize > 100
          ? 100
          : rawPageSize;

    // Build filter object
    const where: Record<string, unknown> = {};

    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (adminId) where.adminId = adminId;

    // Date range filter
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where.createdAt = dateFilter;
    }

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    // Fetch logs with pagination
    const [logs, total] = await Promise.all([
      prisma.tierAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.tierAuditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    // Log detailed error for debugging
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(
      "Error fetching audit logs",
      {
        error: errorMessage,
      },
      error as Error,
    );

    // Check if it's a Prisma error (table doesn't exist, etc.)
    if (
      errorMessage.includes("does not exist") ||
      errorMessage.includes("P2021") ||
      errorMessage.includes("relation")
    ) {
      // Return empty result if table doesn't exist
      return NextResponse.json({
        logs: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize: 50,
          totalPages: 0,
        },
        warning: "Audit log table may need migration",
      });
    }

    return NextResponse.json(
      { error: `Failed to fetch audit logs: ${errorMessage}` },
      { status: 500 },
    );
  }
}
