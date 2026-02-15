import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/audit-logs
 * List audit logs with filters and pagination
 * Query params: action, userId, adminId, startDate, endDate, page, pageSize
 */

export const dynamic = 'force-dynamic';
export const GET = pipe(
  withSentry('/api/admin/audit-logs'),
  withAdminReadOnly,
)(async (ctx) => {
  const searchParams = ctx.req.nextUrl.searchParams;
  const action = searchParams.get('action');
  const userId = searchParams.get('userId');
  const adminId = searchParams.get('adminId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Validate pagination parameters
  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const rawPageSize = parseInt(searchParams.get('pageSize') || '50', 10);
  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const pageSize =
    Number.isNaN(rawPageSize) || rawPageSize < 1 ? 50 : rawPageSize > 100 ? 100 : rawPageSize;

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
      orderBy: { createdAt: 'desc' },
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
});
