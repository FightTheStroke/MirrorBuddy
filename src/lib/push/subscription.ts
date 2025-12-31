// ============================================================================
// PUSH SUBSCRIPTION MANAGEMENT (ADR-0014)
// Client-side subscription lifecycle management
// ============================================================================

import {
  getVapidPublicKey,
  urlBase64ToUint8Array,
  isPushSupported,
  getPushCapabilityStatus,
} from './vapid';

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
    console.warn('[Push] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[Push] Service worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[Push] Service worker registration failed:', error);
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
  // Check capability
  const status = getPushCapabilityStatus();
  if (status !== 'supported') {
    console.warn('[Push] Cannot subscribe:', status);
    return null;
  }

  // Get VAPID key
  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) {
    console.error('[Push] VAPID public key not configured');
    return null;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.log('[Push] Permission denied');
    return null;
  }

  // Get or register service worker
  let registration = await getServiceWorkerRegistration();
  if (!registration) {
    registration = await registerServiceWorker();
  }
  if (!registration) {
    console.error('[Push] No service worker registration');
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
    console.log('[Push] Subscribed:', json.endpoint.slice(0, 50) + '...');

    // Save to server
    const saved = await saveSubscriptionToServer(json);
    if (!saved) {
      console.warn('[Push] Failed to save subscription to server');
      // Still return the subscription - it might work next time
    }

    return json;
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getExistingSubscription();
  if (!subscription) {
    console.log('[Push] No subscription to unsubscribe');
    return true;
  }

  try {
    // Unsubscribe from browser
    await subscription.unsubscribe();

    // Remove from server
    await removeSubscriptionFromServer(subscription.endpoint);

    console.log('[Push] Unsubscribed');
    return true;
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
    return false;
  }
}

/**
 * Save push subscription to server.
 */
async function saveSubscriptionToServer(subscription: PushSubscriptionJSON): Promise<boolean> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: navigator.userAgent,
      }),
    });

    if (!response.ok) {
      console.error('[Push] Server save failed:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Push] Server save error:', error);
    return false;
  }
}

/**
 * Remove push subscription from server.
 */
async function removeSubscriptionFromServer(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });

    return response.ok;
  } catch (error) {
    console.error('[Push] Server delete error:', error);
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
