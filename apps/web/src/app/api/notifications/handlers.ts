import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  GetNotificationsQuerySchema,
  CreateNotificationSchema,
  UpdateNotificationsSchema,
  DeleteNotificationsQuerySchema,
} from "@/lib/validation/schemas/notifications";
import {
  getNotifications,
  getUnreadCount,
  createNotification,
  markNotificationsAsRead,
  dismissNotifications,
} from "./helpers";
import type { MiddlewareContext } from "@/lib/api/pipe";

export const GET = pipe(
  withSentry("/api/notifications"),
  withAuth,
)(async (ctx: MiddlewareContext) => {
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(
    `notifications:${clientId}`,
    RATE_LIMITS.GENERAL,
  );

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  const userId = ctx.userId!;
  const { searchParams } = new URL(ctx.req.url);

  const queryValidation = GetNotificationsQuerySchema.safeParse({
    userId,
    unreadOnly: searchParams.get("unreadOnly"),
    limit: searchParams.get("limit"),
  });

  if (!queryValidation.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: queryValidation.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  const { unreadOnly: unreadOnlyParam, limit: limitParam } =
    queryValidation.data;
  const unreadOnly = unreadOnlyParam === "true";
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  const notifications = await getNotifications(userId, unreadOnly, limit);
  const unreadCount = await getUnreadCount(userId);

  return NextResponse.json({
    success: true,
    data: {
      notifications,
      unreadCount,
    },
  });
});

export const POST = pipe(
  withSentry("/api/notifications"),
  withCSRF,
  withAuth,
)(async (ctx: MiddlewareContext) => {
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(
    `notifications:${clientId}`,
    RATE_LIMITS.GENERAL,
  );

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  const userId = ctx.userId!;
  const body = await ctx.req.json();

  const validation = CreateNotificationSchema.safeParse({
    ...body,
    userId,
  });
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid notification data",
        details: validation.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  const {
    type,
    title,
    message,
    actionUrl,
    metadata,
    scheduledFor,
    expiresAt,
    priority,
    relatedId,
    melissaVoice,
  } = validation.data;

  const notification = await createNotification(userId, {
    type,
    title,
    message,
    actionUrl,
    metadata,
    scheduledFor,
    expiresAt,
    priority,
    relatedId,
    melissaVoice,
  });

  logger.info("Notification created", {
    userId,
    type,
    notificationId: notification.id,
  });

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
});

export const PATCH = pipe(
  withSentry("/api/notifications"),
  withCSRF,
  withAuth,
)(async (ctx: MiddlewareContext) => {
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(
    `notifications:${clientId}`,
    RATE_LIMITS.GENERAL,
  );

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  const userId = ctx.userId!;
  const body = await ctx.req.json();

  const validation = UpdateNotificationsSchema.safeParse({
    ...body,
    userId,
  });
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid update data",
        details: validation.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  const { notificationIds, markAllRead } = validation.data;

  if (markAllRead) {
    await markNotificationsAsRead(userId);
    return NextResponse.json({
      success: true,
      message: "All notifications marked as read",
    });
  }

  if (!notificationIds || notificationIds.length === 0) {
    return NextResponse.json(
      { error: "notificationIds required when markAllRead is false" },
      { status: 400 },
    );
  }

  await markNotificationsAsRead(userId, notificationIds);
  return NextResponse.json({
    success: true,
    message: "Notifications marked as read",
  });
});

export const DELETE = pipe(
  withSentry("/api/notifications"),
  withCSRF,
  withAuth,
)(async (ctx: MiddlewareContext) => {
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(
    `notifications:${clientId}`,
    RATE_LIMITS.GENERAL,
  );

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  const userId = ctx.userId!;
  const { searchParams } = new URL(ctx.req.url);

  const queryValidation = DeleteNotificationsQuerySchema.safeParse({
    userId,
    id: searchParams.get("id"),
    dismissAll: searchParams.get("dismissAll"),
  });

  if (!queryValidation.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: queryValidation.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  const { id: notificationId, dismissAll: dismissAllParam } =
    queryValidation.data;
  const dismissAll = dismissAllParam === "true";

  if (dismissAll) {
    await dismissNotifications(userId);
    return NextResponse.json({
      success: true,
      message: "All notifications dismissed",
    });
  }

  if (notificationId) {
    await dismissNotifications(userId, notificationId);
    return NextResponse.json({
      success: true,
      message: "Notification dismissed",
    });
  }

  return NextResponse.json(
    { error: "Either notificationId or dismissAll=true is required" },
    { status: 400 },
  );
});
