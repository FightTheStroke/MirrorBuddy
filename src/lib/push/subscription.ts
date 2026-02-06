// ============================================================================
// PUSH SUBSCRIPTION MANAGEMENT (ADR-0014)
// Client-side subscription lifecycle management
// Supports both native (Capacitor) and web push notifications
// ============================================================================

import {
  getVapidPublicKey,
  urlBase64ToUint8Array,
  isPushSupported,
  getPushCapabilityStatus,
} from "./vapid";
import {
  isCapacitorEnvironment,
  requestPushPermission as requestCapacitorPermission,
  registerForPush as registerCapacitorPush,
} from "./capacitor-push";
import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth/csrf-client";

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Register the service worker for push notifications.
 * Must be called before subscribing.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    logger.warn("[Push] Service workers not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    logger.debug("[Push] Service worker registered", {
      scope: registration.scope,
    });
    return registration;
  } catch (error) {
    logger.error("[Push] Service worker registration failed", undefined, error);
    return null;
  }
}

/**
 * Get existing service worker registration.
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/**
 * Get existing push subscription if any.
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return null;

  try {
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Request notification permission and subscribe to push.
 * Returns the subscription if successful, null otherwise.
 */
export async function subscribeToPush(): Promise<PushSubscriptionJSON | null> {
  // Native Capacitor path: use APNs/FCM directly
  if (isCapacitorEnvironment()) {
    const permission = await requestCapacitorPermission();
    if (permission !== "granted") {
      logger.info("[Push] Native permission denied");
      return null;
    }
    const result = await registerCapacitorPush();
    if (result && result.platform === "native") {
      logger.info("[Push] Native push registered", {
        token: result.token.slice(0, 20) + "...",
      });
      // Native tokens are stored server-side via a different mechanism
      return null;
    }
    logger.warn("[Push] Native push registration returned unexpected result");
    return null;
  }

  // Web push path
  const status = getPushCapabilityStatus();
  if (status !== "supported") {
    logger.warn("[Push] Cannot subscribe", { status });
    return null;
  }

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) {
    logger.error("[Push] VAPID public key not configured");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    logger.info("[Push] Permission denied");
    return null;
  }

  // Get or register service worker
  let registration = await getServiceWorkerRegistration();
  if (!registration) {
    registration = await registerServiceWorker();
  }
  if (!registration) {
    logger.error("[Push] No service worker registration");
    return null;
  }

  // Subscribe to push
  try {
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });

    const json = subscription.toJSON() as PushSubscriptionJSON;
    logger.info("[Push] Subscribed", { endpoint: json.endpoint.slice(0, 50) });

    // Save to server
    const saved = await saveSubscriptionToServer(json);
    if (!saved) {
      logger.warn("[Push] Failed to save subscription to server");
      // Still return the subscription - it might work next time
    }

    return json;
  } catch (error) {
    logger.error("[Push] Subscription failed", undefined, error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getExistingSubscription();
  if (!subscription) {
    logger.debug("[Push] No subscription to unsubscribe");
    return true;
  }

  try {
    // Unsubscribe from browser
    await subscription.unsubscribe();

    // Remove from server
    await removeSubscriptionFromServer(subscription.endpoint);

    logger.info("[Push] Unsubscribed");
    return true;
  } catch (error) {
    logger.error("[Push] Unsubscribe failed", undefined, error);
    return false;
  }
}

/**
 * Save push subscription to server.
 */
async function saveSubscriptionToServer(
  subscription: PushSubscriptionJSON,
): Promise<boolean> {
  try {
    const response = await csrfFetch("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: navigator.userAgent,
      }),
    });

    if (!response.ok) {
      logger.error("[Push] Server save failed", { status: response.status });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("[Push] Server save error", undefined, error);
    return false;
  }
}

/**
 * Remove push subscription from server.
 */
async function removeSubscriptionFromServer(
  endpoint: string,
): Promise<boolean> {
  try {
    const response = await csrfFetch("/api/push/subscribe", {
      method: "DELETE",
      body: JSON.stringify({ endpoint }),
    });

    return response.ok;
  } catch (error) {
    logger.error("[Push] Server delete error", undefined, error);
    return false;
  }
}

/**
 * Check if currently subscribed to push.
 */
export async function isPushSubscribed(): Promise<boolean> {
  const subscription = await getExistingSubscription();
  return subscription !== null;
}
