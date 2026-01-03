// ============================================================================
// SERVER-SIDE PUSH SENDER (ADR-0014)
// Sends push notifications to subscribed devices
// NOTE: This file is server-only - do not import in client code
// ============================================================================

import webpush from 'web-push';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@mirrorbuddyedu.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  logger.warn('[Push] VAPID keys not configured - push notifications disabled');
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Send push notification to a specific subscription.
 * Returns true if successful, false otherwise.
 */
export async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    logger.warn('[Push] Cannot send - VAPID keys not configured');
    return false;
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/notification.png',
        badge: payload.badge || '/icons/badge.png',
        tag: payload.tag,
        data: { url: payload.url || '/' },
        requireInteraction: payload.requireInteraction || false,
        actions: payload.actions || [],
      })
    );
    return true;
  } catch (error) {
    const err = error as { statusCode?: number };

    // Handle expired/invalid subscriptions
    if (err.statusCode === 410 || err.statusCode === 404) {
      logger.info('[Push] Subscription expired, removing', {
        endpoint: subscription.endpoint.slice(0, 50)
      });
      await removeExpiredSubscription(subscription.endpoint);
    } else {
      logger.error('[Push] Send failed', {
        error: String(error),
        endpoint: subscription.endpoint.slice(0, 50),
      });
    }
    return false;
  }
}

/**
 * Send push notification to all subscriptions for a user.
 * Returns number of successful sends.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<number> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return 0;
  }

  let successCount = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      const success = await sendPushToSubscription(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      );
      if (success) successCount++;
    })
  );

  logger.info('[Push] Sent to user', {
    userId,
    total: subscriptions.length,
    success: successCount
  });

  return successCount;
}

/**
 * Remove an expired subscription from the database.
 */
async function removeExpiredSubscription(endpoint: string): Promise<void> {
  try {
    await prisma.pushSubscription.delete({
      where: { endpoint },
    });
  } catch (error) {
    // Ignore if already deleted
    logger.debug('[Push] Could not delete expired subscription', {
      error: String(error)
    });
  }
}

/**
 * Check if VAPID keys are configured.
 */
export function isPushConfigured(): boolean {
  return Boolean(vapidPublicKey && vapidPrivateKey);
}
