import {
  clearTermsConsent,
  getUnifiedConsent,
  hasUnifiedConsent,
  saveTermsConsent,
} from './unified-consent-storage';

export interface TrialConsentData {
  accepted: boolean;
  version: string;
  acceptedAt: string;
}

/** Trial access still requires current terms; optional analytics is independent. */
export const hasTrialConsent = hasUnifiedConsent;

/** Called by the welcome form's explicit terms action, not by analytics controls. */
export function setTrialConsent(): void {
  saveTermsConsent(true);
  if (typeof window !== 'undefined') localStorage.removeItem('trialConsent');
}

export function clearTrialConsent(): void {
  clearTermsConsent();
}

/** Compatibility view of terms, not a separate trial consent store. */
export function getTrialConsent(): TrialConsentData | null {
  const consent = getUnifiedConsent();
  if (consent?.tos.accepted == null) return null;
  return { ...consent.tos, accepted: consent.tos.accepted };
}
