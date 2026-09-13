import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hasConsent,
  getConsent,
  saveConsent,
  saveTermsConsent,
  clearConsent,
  hasAnalyticsConsent,
  syncConsentToServer,
} from '../consent/consent-service';
import { clearConsent as revokeCookies } from '../consent/consent-storage';
import { setTrialConsent, hasTrialConsent } from '../consent/trial-consent';
import {
  installConsentTransportMock,
  setConsentTestAccount,
} from '../consent/__tests__/consent-test-transport';

const firstDate = '2026-02-01T00:00:00.000Z';
const secondDate = '2026-02-02T00:00:00.000Z';

describe('Consent Revocation Consistency', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(firstDate));
    setConsentTestAccount();
    installConsentTransportMock(true);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    setConsentTestAccount();
  });

  it('records independently granted terms and analytics in the same contract', async () => {
    saveTermsConsent(true);
    setConsentTestAccount(true);
    await syncConsentToServer(saveConsent(true));
    expect(hasConsent()).toBe(true);
    expect(hasAnalyticsConsent()).toBe(true);
    expect(getConsent()).toEqual({
      version: '1.0',
      tos: { accepted: true, version: '1.0', acceptedAt: firstDate },
      cookies: { essential: true, analytics: true, version: '1.0', acceptedAt: firstDate },
    });
  });

  it('grants trial terms without granting analytics', () => {
    setTrialConsent();
    expect(hasTrialConsent()).toBe(true);
    expect(hasAnalyticsConsent()).toBe(false);
    expect(getConsent()?.cookies.analytics).toBeNull();
  });

  it('does not treat the deprecated trial argument as terms evidence', () => {
    saveConsent(false, true);
    expect(hasConsent()).toBe(false);
    expect(hasTrialConsent()).toBe(false);
  });

  it('revokes all consent data', () => {
    saveTermsConsent(true);
    saveConsent(true);
    clearConsent();
    expect(hasConsent()).toBe(false);
    expect(getConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
    expect(hasTrialConsent()).toBe(false);
  });

  it('clears all legacy records and markers so reads cannot resurrect acceptance', () => {
    saveTermsConsent(true);
    const localKeys = [
      'mirrorbuddy-consent',
      'trialConsent',
      'mirrorbuddy-consent-migrated',
      'mirrorbuddy-trial-migrated',
    ];
    const sessionKeys = [
      'tos_accepted',
      'tos_accepted_version',
      'tos_migrated',
      'mirrorbuddy-consent-loaded',
    ];
    localKeys.forEach((key) => localStorage.setItem(key, 'true'));
    sessionKeys.forEach((key) => sessionStorage.setItem(key, 'true'));
    clearConsent();
    [...localKeys, 'mirrorbuddy-unified-consent'].forEach((key) =>
      expect(localStorage.getItem(key)).toBeNull(),
    );
    sessionKeys.forEach((key) => expect(sessionStorage.getItem(key)).toBeNull());
    expect(getConsent()).toBeNull();
  });

  it('revokes analytics without changing mandatory terms or their date', () => {
    saveTermsConsent(true);
    saveConsent(true);
    const terms = getConsent()?.tos;
    vi.setSystemTime(new Date(secondDate));
    saveConsent(false);
    expect(getConsent()?.tos).toEqual(terms);
    expect(getConsent()?.cookies.acceptedAt).toBe(secondDate);
    expect(hasConsent()).toBe(true);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('cookie-only clear explicitly refuses analytics and preserves terms', () => {
    saveTermsConsent(true);
    saveConsent(true);
    revokeCookies();
    expect(getConsent()?.cookies.analytics).toBe(false);
    expect(hasConsent()).toBe(true);
  });

  it('revokes terms without silently changing analytics', () => {
    saveTermsConsent(true);
    saveConsent(true);
    const analytics = getConsent()?.cookies;
    saveTermsConsent(false);
    expect(hasConsent()).toBe(false);
    expect(getConsent()?.cookies).toEqual(analytics);
  });

  it('does not undo a terms refusal when analytics changes', () => {
    saveTermsConsent(false);
    saveConsent(true);
    expect(getConsent()?.tos.accepted).toBe(false);
    expect(hasConsent()).toBe(false);
  });

  it('maintains independent decisions across grant/revoke cycles', async () => {
    saveTermsConsent(true);
    setConsentTestAccount(true);
    for (const analytics of [true, false, true, false]) {
      await syncConsentToServer(saveConsent(analytics));
      expect(hasConsent()).toBe(true);
      expect(hasAnalyticsConsent()).toBe(analytics);
    }
  });

  it('does not leave orphaned keys after all-consent revocation', () => {
    setTrialConsent();
    saveConsent(true);
    clearConsent();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('allows revocation with no existing consent', () => {
    expect(() => clearConsent()).not.toThrow();
    expect(hasConsent()).toBe(false);
  });

  it('allows revocation of malformed consent without accepting it', () => {
    localStorage.setItem('mirrorbuddy-unified-consent', 'invalid-json');
    expect(hasConsent()).toBe(false);
    expect(getConsent()).toBeNull();
    expect(() => clearConsent()).not.toThrow();
  });

  it('preserves the original terms timestamp during analytics-only writes', () => {
    saveTermsConsent(true);
    vi.setSystemTime(new Date(secondDate));
    saveConsent(false);
    expect(getConsent()?.tos.acceptedAt).toBe(firstDate);
    expect(getConsent()?.cookies.acceptedAt).toBe(secondDate);
  });

  it('does not recreate a timestamp on an idempotent terms acceptance', () => {
    saveTermsConsent(true);
    vi.setSystemTime(new Date(secondDate));
    saveTermsConsent(true);
    expect(getConsent()?.tos.acceptedAt).toBe(firstDate);
  });
});
