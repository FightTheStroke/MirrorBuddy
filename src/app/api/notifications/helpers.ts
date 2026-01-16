/**
 * Notifications API helpers
 */

import { prisma } from '@/lib/db';

/**
 * Get notifications for a user
 */
export async function getNotifications(userId: string, unreadOnly: boolean, limit: number) {
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

  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    actionUrl: n.actionUrl,
    metadata: n.metadata ? JSON.parse(n.metadata) : undefined,
    read: n.read,
    createdAt: n.createdAt,
  }));
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return await prisma.notification.count({
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
}

/**
 * Create a notification
 */
export async function createNotification(userId: string, data: {
  type: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  scheduledFor?: string;
  expiresAt?: string;
  priority?: string | null;
  relatedId?: string | null;
  melissaVoice?: string | null;
}) {
  return await prisma.notification.create({
    data: {
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl ?? null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
      sentAt: data.scheduledFor ? undefined : new Date(),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      priority: data.priority ?? null,
      relatedId: data.relatedId ?? null,
      melissaVoice: data.melissaVoice ?? null,
    },
  });
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(userId: string, notificationIds?: string[]) {
  if (!notificationIds || notificationIds.length === 0) {
    // Mark all as read
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  } else {
    // Mark specific notifications as read
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: { read: true },
    });
  }
}

/**
 * Dismiss notifications
 */
export async function dismissNotifications(userId: string, notificationId?: string) {
  if (notificationId) {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: { dismissed: true },
    });
  } else {
    // Dismiss all
    await prisma.notification.updateMany({
      where: { userId },
      data: { dismissed: true },
    });
  }
}
