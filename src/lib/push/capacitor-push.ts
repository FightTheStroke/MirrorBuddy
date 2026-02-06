// ============================================================================
// CAPACITOR PUSH NOTIFICATIONS (T1-03)
// Native vs web push detection and delegation
// ============================================================================

import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { logger } from "@/lib/logger";

export interface NativePushRegistration {
  token: string;
  platform: "native";
}

export interface WebPushDelegation {
  platform: "web";
  useWebPush: true;
}

export type PushRegistrationResult =
  | NativePushRegistration
  | WebPushDelegation
  | null;

/**
 * Check if running in a native Capacitor environment.
 * Returns true for iOS/Android apps, false for web.
 */
export function isCapacitorEnvironment(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Request push notification permission.
 * Uses native API on Capacitor, web API on browser.
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (isCapacitorEnvironment()) {
    try {
      const result = await PushNotifications.requestPermissions();
      logger.debug("[Push/Capacitor] Permission requested", { result });
      return result.receive === "granted" ? "granted" : "denied";
    } catch (error) {
      logger.error(
        "[Push/Capacitor] Permission request failed",
        undefined,
        error,
      );
      return "denied";
    }
  } else {
    // Web environment - delegate to browser API
    if (!("Notification" in window)) {
      logger.warn("[Push/Capacitor] Notifications not supported in browser");
      return "denied";
    }
    return await Notification.requestPermission();
  }
}

/**
 * Register for push notifications.
 * On native: registers with APNs/FCM and returns token.
 * On web: returns delegation flag to use web push implementation.
 */
export async function registerForPush(): Promise<PushRegistrationResult> {
  if (isCapacitorEnvironment()) {
    try {
      // Native registration
      logger.debug("[Push/Capacitor] Registering for native push");

      // Listen for registration success
      const registrationPromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Registration timeout"));
        }, 10000);

        PushNotifications.addListener("registration", (token) => {
          clearTimeout(timeout);
          logger.info("[Push/Capacitor] Registration successful", {
            token: token.value.slice(0, 20) + "...",
          });
          resolve(token.value);
        });

        PushNotifications.addListener("registrationError", (error) => {
          clearTimeout(timeout);
          logger.error("[Push/Capacitor] Registration error", undefined, error);
          reject(error);
        });
      });

      // Trigger registration
      await PushNotifications.register();

      // Wait for token
      const token = await registrationPromise;

      return {
        token,
        platform: "native",
      };
    } catch (error) {
      logger.error("[Push/Capacitor] Registration failed", undefined, error);
      return null;
    }
  } else {
    // Web environment - delegate to existing web push implementation
    logger.debug("[Push/Capacitor] Delegating to web push implementation");
    return {
      platform: "web",
      useWebPush: true,
    };
  }
}

/**
 * Unregister from push notifications.
 * On native: removes all Capacitor push listeners.
 * On web: no-op (handled by subscription.ts unsubscribeFromPush).
 */
export async function unregisterFromPush(): Promise<boolean> {
  if (isCapacitorEnvironment()) {
    try {
      await PushNotifications.removeAllListeners();
      logger.debug("[Push/Capacitor] Unregistered from native push");
      return true;
    } catch (error) {
      logger.error("[Push/Capacitor] Unregister failed", undefined, error);
      return false;
    }
  }
  return true;
}
