/**
 * Admin Audit Log API
 * F-23 - Query admin action audit logs with filters and pagination
 *
 * GET /api/admin/audit
 * Query params: action, entityType, adminId, from, to, page, pageSize
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { queryAuditLog } from "@/lib/admin/audit-service";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "admin-audit-api" });

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Extract filter parameters
    const action = searchParams.get("action") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const adminId = searchParams.get("adminId") || undefined;
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    // Parse dates
    const from = fromStr ? new Date(fromStr) : undefined;
    const to = toStr ? new Date(toStr) : undefined;

    // Parse pagination
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const rawPageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const pageSize =
      Number.isNaN(rawPageSize) || rawPageSize < 1
        ? 50
        : rawPageSize > 100
          ? 100
          : rawPageSize;

    // Query audit log
    const result = await queryAuditLog({
      action,
      entityType,
      adminId,
      from,
      to,
      page,
      pageSize,
    });

    return NextResponse.json({
      logs: result.logs,
      total: result.total,
      page,
      pageSize,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    log.error("Error querying audit logs", { error: errorMessage });

    return NextResponse.json(
      { error: `Failed to query audit logs: ${errorMessage}` },
      { status: 500 },
    );
  }
}
