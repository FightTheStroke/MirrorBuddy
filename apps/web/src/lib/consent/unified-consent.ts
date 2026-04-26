import {
  getUnifiedConsent,
  hasUnifiedConsent,
  saveUnifiedConsent,
  type UnifiedConsentData,
} from './unified-consent-storage';

export type UnifiedConsent = UnifiedConsentData;

export interface ConsentService {
  hasConsent: () => boolean;
  read: () => UnifiedConsent | null;
  acceptAll: (analytics?: boolean) => UnifiedConsent;
}

export const unifiedConsentService: ConsentService = {
  hasConsent: () => hasUnifiedConsent(),
  read: () => getUnifiedConsent(),
  acceptAll: (analytics = true) => saveUnifiedConsent(analytics),
};
