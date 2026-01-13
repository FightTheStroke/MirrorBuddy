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
import {
  GetNotificationsQuerySchema,
  CreateNotificationSchema,
  UpdateNotificationsSchema,
  DeleteNotificationsQuerySchema,
} from '@/lib/validation/schemas/notifications';

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

    // Validate query parameters
    const queryValidation = GetNotificationsQuerySchema.safeParse({
      userId: searchParams.get('userId'),
      unreadOnly: searchParams.get('unreadOnly'),
      limit: searchParams.get('limit'),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: queryValidation.error.issues.map(i => i.message),
        },
        { status: 400 }
      );
    }

    const { userId, unreadOnly: unreadOnlyParam, limit: limitParam } = queryValidation.data;
    const unreadOnly = unreadOnlyParam === 'true';
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

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
        notifications: notifications.map((n) => ({
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

    // Validate request body
    const validation = CreateNotificationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid notification data',
          details: validation.error.issues.map(i => i.message),
        },
        { status: 400 }
      );
    }

    const { userId, type, title, message, actionUrl, metadata, scheduledFor, expiresAt, priority, relatedId, melissaVoice } = validation.data;

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        actionUrl: actionUrl ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        sentAt: scheduledFor ? undefined : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        priority: priority ?? null,
        relatedId: relatedId ?? null,
        melissaVoice: melissaVoice ?? null,
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

    // Validate request body
    const validation = UpdateNotificationsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          details: validation.error.issues.map(i => i.message),
        },
        { status: 400 }
      );
    }

    const { userId, notificationIds, markAllRead } = validation.data;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    // notificationIds is guaranteed to exist by schema validation when markAllRead is false
    if (!notificationIds || notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'notificationIds required when markAllRead is false' },
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

    // Validate query parameters
    const queryValidation = DeleteNotificationsQuerySchema.safeParse({
      userId: searchParams.get('userId'),
      id: searchParams.get('id'),
      dismissAll: searchParams.get('dismissAll'),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: queryValidation.error.issues.map(i => i.message),
        },
        { status: 400 }
      );
    }

    const { userId, id: notificationId, dismissAll: dismissAllParam } = queryValidation.data;
    const dismissAll = dismissAllParam === 'true';

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
