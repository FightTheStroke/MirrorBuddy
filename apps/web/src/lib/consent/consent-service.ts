/**
 * Compatibility facade. The former feature-flag branches wrote competing records.
 * All consumers now use the existing unified key and the same decision contract.
 */
export {
  hasUnifiedConsent as hasConsent,
  getUnifiedConsent as getConsent,
  clearUnifiedConsent as clearConsent,
  hasAnalyticsConsent,
  syncUnifiedConsentToServer as syncConsentToServer,
  loadUnifiedConsentFromDB as loadConsentFromDB,
  initializeConsent,
  saveTermsConsent,
  type UnifiedConsentData,
} from './unified-consent-storage';
import { saveAnalyticsConsent } from './unified-consent-storage';

/** The old trial argument is not evidence of terms acceptance. Use saveTermsConsent explicitly. */
export function saveConsent(analytics: boolean = false, _trial: boolean = false) {
  return saveAnalyticsConsent(analytics);
}

export function isLegacyMigrated(): boolean {
  return (
    typeof window !== 'undefined' && localStorage.getItem('mirrorbuddy-consent-migrated') === 'true'
  );
}
