/**
 * Admin API: Terms of Service Acceptances
 *
 * GET /api/admin/tos - List ToS acceptances with pagination
 *
 * F-13: Admin panel to view ToS acceptances (who, when, version)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateAdminAuth } from '@/lib/auth/session-auth';

const log = logger.child({ module: 'api/admin/tos' });

interface TosAcceptanceWithUser {
  id: string;
  userId: string;
  version: string;
  acceptedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  user: {
    profile: {
      name: string | null;
    } | null;
    googleAccount: {
      email: string;
    } | null;
  };
}

interface GetResponse {
  acceptances: TosAcceptanceWithUser[];
  summary: {
    totalAcceptances: number;
    uniqueUsers: number;
    versionCounts: Record<string, number>;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

/**
 * GET /api/admin/tos
 * List ToS acceptances with user info and pagination
 *
 * Query params:
 * - page: number (default: 1)
 * - pageSize: number (default: 50, max: 100)
 * - version: string (optional filter)
 * - sortBy: "acceptedAt" | "version" (default: "acceptedAt")
 * - sortOrder: "asc" | "desc" (default: "desc")
 */
export async function GET(request: NextRequest) {
  // Require admin authentication
  const auth = await validateAdminAuth();

  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!auth.isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10))
    );
    const version = searchParams.get('version') || undefined;
    const sortBy = searchParams.get('sortBy') || 'acceptedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where = version ? { version } : {};

    // Get total count
    const totalCount = await prisma.tosAcceptance.count({ where });

    // Get paginated acceptances with user info
    const acceptances = await prisma.tosAcceptance.findMany({
      where,
      include: {
        user: {
          select: {
            profile: {
              select: {
                name: true,
              },
            },
            googleAccount: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Get summary stats
    const [uniqueUsersCount, versionGroups] = await Promise.all([
      prisma.tosAcceptance.groupBy({
        by: ['userId'],
        _count: true,
      }),
      prisma.tosAcceptance.groupBy({
        by: ['version'],
        _count: true,
      }),
    ]);

    const versionCounts = versionGroups.reduce(
      (acc, group) => {
        acc[group.version] = group._count;
        return acc;
      },
      {} as Record<string, number>
    );

    const response: GetResponse = {
      acceptances,
      summary: {
        totalAcceptances: totalCount,
        uniqueUsers: uniqueUsersCount.length,
        versionCounts,
      },
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        totalCount,
      },
    };

    log.info('Admin ToS list accessed', {
      adminId: auth.userId,
      page,
      pageSize,
      version,
    });

    return NextResponse.json(response);
  } catch (error) {
    log.error('Admin ToS list error', {
      adminId: auth.userId,
      error: String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
