// ============================================================================
// PUSH NOTIFICATIONS MODULE (ADR-0014)
// Exports for PWA push notification support
// ============================================================================

// VAPID utilities
export {
  getVapidPublicKey,
  urlBase64ToUint8Array,
  isPushSupported,
  isInstalledPWA,
  isIOSSafariBrowser,
  getPushCapabilityStatus,
  getPushCapabilityMessage,
  type PushCapabilityStatus,
} from './vapid';

// Subscription management
export {
  registerServiceWorker,
  getServiceWorkerRegistration,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
  type PushSubscriptionJSON,
} from './subscription';
