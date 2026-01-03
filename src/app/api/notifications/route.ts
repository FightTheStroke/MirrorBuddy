/**
 * API Route: Notifications
 *
 * GET /api/notifications - Get user notifications
 * POST /api/notifications - Create notification (internal use)
 * PATCH /api/notifications - Mark notifications as read
 * DELETE /api/notifications - Delete notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';

// Inline type for Notification record
interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  metadata: string | null;
  read: boolean;
  createdAt: Date;
}

/**
 * GET /api/notifications
 * Returns notifications for a user
 */
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`notifications:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        dismissed: false,
        ...(unreadOnly && { read: false }),
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        read: false,
        dismissed: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications.map((n: NotificationRecord) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          actionUrl: n.actionUrl,
          metadata: n.metadata ? JSON.parse(n.metadata) : undefined,
          read: n.read,
          createdAt: n.createdAt,
        })),
        unreadCount,
      },
    });
  } catch (error) {
    logger.error('Get notifications error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/notifications
 * Create a notification
 */
export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`notifications:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();
    const { userId, type, title, message, actionUrl, metadata, scheduledFor, expiresAt } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'userId, type, title, and message are required' },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        actionUrl,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        sentAt: scheduledFor ? undefined : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    });

    logger.info('Notification created', { userId, type, notificationId: notification.id });

    return NextResponse.json({
      success: true,
      data: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
      },
    });
  } catch (error) {
    logger.error('Create notification error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read
 */
export async function PATCH(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`notifications:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();
    const { userId, notificationIds, markAllRead } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'notificationIds array is required when not using markAllRead' },
        { status: 400 }
      );
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId, // Ensure user owns these notifications
      },
      data: { read: true },
    });

    return NextResponse.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    logger.error('Update notifications error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications
 * Delete or dismiss notifications
 */
export async function DELETE(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`notifications:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const notificationId = searchParams.get('id');
    const dismissAll = searchParams.get('dismissAll') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (dismissAll) {
      // Soft delete - mark as dismissed
      await prisma.notification.updateMany({
        where: { userId },
        data: { dismissed: true },
      });

      return NextResponse.json({ success: true, message: 'All notifications dismissed' });
    }

    if (notificationId) {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId, // Ensure user owns this notification
        },
        data: { dismissed: true },
      });

      return NextResponse.json({ success: true, message: 'Notification dismissed' });
    }

    return NextResponse.json(
      { error: 'Either notificationId or dismissAll=true is required' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Delete notifications error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
