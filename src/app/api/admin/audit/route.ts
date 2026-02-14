/**
 * Admin Audit Log API
 * F-23 - Query admin action audit logs with filters and pagination
 *
 * GET /api/admin/audit
 * Query params: action, entityType, adminId, from, to, page, pageSize
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { queryAuditLog } from "@/lib/admin/audit-service";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/admin/audit"),
  withAdmin,
)(async (ctx) => {
  const searchParams = ctx.req.nextUrl.searchParams;

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
});
