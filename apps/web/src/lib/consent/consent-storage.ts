/** Flat cookie API compatibility view; never owns a separate persisted record. */
import {
  getUnifiedConsent,
  saveAnalyticsConsent,
  syncUnifiedConsentToServer,
  ConsentSyncError,
  type UnifiedConsentData,
} from './unified-consent-storage';
import { CONSENT_VERSION } from './unified-consent';
export { hasAnalyticsConsent } from './unified-consent-storage';

export interface ConsentData {
  version: string;
  acceptedAt: string;
  essential: true;
  analytics: boolean;
  /** Fixed transport compatibility field, not a supported consent decision. */
  marketing: false;
}
const writes = new WeakMap<ConsentData, UnifiedConsentData>();

function cookieView(consent: UnifiedConsentData): ConsentData {
  return {
    version: consent.cookies.version,
    acceptedAt: consent.cookies.acceptedAt,
    essential: true,
    analytics: consent.cookies.analytics === true,
    marketing: false,
  };
}

/** Indicates a recorded cookie choice, not acceptance of mandatory terms. */
export function hasConsent(): boolean {
  const consent = getUnifiedConsent();
  return consent?.cookies.analytics != null && consent.cookies.version === CONSENT_VERSION;
}

export function getConsent(): ConsentData | null {
  const consent = getUnifiedConsent();
  return consent?.cookies.analytics != null ? cookieView(consent) : null;
}

export function saveConsent(analytics: boolean = false): ConsentData {
  const consent = saveAnalyticsConsent(analytics);
  const view = cookieView(consent);
  writes.set(view, consent);
  return view;
}

/** Cookie-only revocation leaves mandatory terms unchanged. */
export function clearConsent(): void {
  saveAnalyticsConsent(false);
}

export async function syncConsentToServer(consent: ConsentData): Promise<void> {
  const intent = consent && writes.get(consent);
  if (!intent) throw new ConsentSyncError('invalid-intent');
  await syncUnifiedConsentToServer(intent);
}
