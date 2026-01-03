/**
 * API Route: Parent Dashboard Last Viewed Timestamp
 * GET: Get when parent dashboard was last viewed
 * POST: Update the last viewed timestamp
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/profile/last-viewed
 * Returns the timestamp when parent dashboard was last viewed
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ lastViewed: null });
    }

    const settings = await prisma.settings.findUnique({
      where: { userId },
      select: { parentDashboardLastViewed: true },
    });

    return NextResponse.json({
      lastViewed: settings?.parentDashboardLastViewed?.toISOString() || null,
    });
  } catch (error) {
    logger.error('Failed to get last viewed timestamp', { error: String(error) });
    return NextResponse.json({ lastViewed: null });
  }
}

/**
 * POST /api/profile/last-viewed
 * Updates the last viewed timestamp
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await request.json();
    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();

    // Upsert settings with the new timestamp
    await prisma.settings.upsert({
      where: { userId },
      update: { parentDashboardLastViewed: timestamp },
      create: {
        userId,
        parentDashboardLastViewed: timestamp,
      },
    });

    return NextResponse.json({ success: true, lastViewed: timestamp.toISOString() });
  } catch (error) {
    logger.error('Failed to update last viewed timestamp', { error: String(error) });
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
