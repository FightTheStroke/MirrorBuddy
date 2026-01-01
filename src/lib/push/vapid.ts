// ============================================================================
// VAPID KEY MANAGEMENT (ADR-0014)
// Handles VAPID keys for Web Push authentication
// ============================================================================

import { logger } from '@/lib/logger';

/**
 * Get the VAPID public key for client-side subscription.
 * This is safe to expose - it's a public key.
 */
export function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) {
    logger.warn('[VAPID] NEXT_PUBLIC_VAPID_PUBLIC_KEY not configured');
    return null;
  }
  return key;
}

/**
 * Convert URL-safe base64 VAPID key to Uint8Array for subscription.
 * Required by the Push API's applicationServerKey parameter.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are potentially available.
 * Does NOT check permission status, only capability.
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Check if running as installed PWA (standalone mode).
 * Required for iOS push notifications.
 */
export function isInstalledPWA(): boolean {
  if (typeof window === 'undefined') return false;

  // Check display-mode media query (most reliable)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  // iOS Safari uses navigator.standalone
  const isIOSStandalone = 'standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isStandalone || isIOSStandalone;
}

/**
 * Check if device is iOS Safari (not installed as PWA).
 * These users need to install the PWA to get push notifications.
 */
export function isIOSSafariBrowser(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isWebkit = /WebKit/.test(ua);
  const isNotChrome = !/CriOS/.test(ua);
  const isNotFirefox = !/FxiOS/.test(ua);

  return isIOS && isWebkit && isNotChrome && isNotFirefox && !isInstalledPWA();
}

/**
 * Get push notification capability status.
 * Returns a descriptive status for UI display.
 */
export type PushCapabilityStatus =
  | 'supported'           // Full support, can subscribe
  | 'ios_needs_install'   // iOS Safari - needs PWA install
  | 'permission_denied'   // User denied, need to reset in settings
  | 'unsupported';        // Browser doesn't support Push API

export function getPushCapabilityStatus(): PushCapabilityStatus {
  if (!isPushSupported()) {
    return 'unsupported';
  }

  if (isIOSSafariBrowser()) {
    return 'ios_needs_install';
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    return 'permission_denied';
  }

  return 'supported';
}

/**
 * Get user-friendly message for push capability status.
 */
export function getPushCapabilityMessage(status: PushCapabilityStatus): string {
  switch (status) {
    case 'supported':
      return 'Le notifiche push sono disponibili.';
    case 'ios_needs_install':
      return 'Per ricevere notifiche, aggiungi questa app alla Home del tuo dispositivo.';
    case 'permission_denied':
      return 'Le notifiche sono state bloccate. Puoi riattivarle dalle impostazioni del browser.';
    case 'unsupported':
      return 'Il tuo browser non supporta le notifiche push.';
  }
}
