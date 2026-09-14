import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consentFromServer,
  getUnifiedConsent,
  hasAnalyticsConsent,
  hasUnifiedConsent,
  saveAnalyticsConsent,
  saveTermsConsent,
  syncUnifiedConsentToServer,
} from '../unified-consent-storage';
import { migrateConsent, migrateLegacyConsentKeys } from '../consent-migration';
import { CONSENT_VERSION, UNIFIED_CONSENT_KEY } from '../unified-consent';
import { installConsentTransportMock, setConsentTestAccount } from './consent-test-transport';

const date = '2026-02-01T00:00:00.000Z';
const oldCookie = {
  essential: true,
  analytics: false,
  version: '1.0',
  marketing: false,
  acceptedAt: date,
};

describe('canonical persistence boundary', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setConsentTestAccount();
    installConsentTransportMock(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    setConsentTestAccount();
  });

  it('unknown browser state permits neither mandatory terms nor optional analytics', () => {
    expect(getUnifiedConsent()).toBeNull();
    expect(hasUnifiedConsent()).toBe(false);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it.each([null, false, true])(
    'writing terms preserves analytics decision %s and its evidence',
    (analytics) => {
      if (analytics !== null) saveAnalyticsConsent(analytics);
      const before = getUnifiedConsent()?.cookies;
      saveTermsConsent(true);
      if (before) expect(getUnifiedConsent()?.cookies).toEqual(before);
      else expect(getUnifiedConsent()?.cookies.analytics).toBeNull();
      expect(hasUnifiedConsent()).toBe(true);
      saveTermsConsent(false);
      expect(getUnifiedConsent()?.cookies.analytics).toBe(analytics);
      expect(hasUnifiedConsent()).toBe(false);
    },
  );

  it.each([null, 'true', 1, {}, []])(
    'rejects invalid explicit choice %j without writing',
    (value) => {
      for (const writer of [saveTermsConsent, saveAnalyticsConsent]) {
        expect(() => Reflect.apply(writer, undefined, [value])).toThrow(TypeError);
        expect(getUnifiedConsent()).toBeNull();
      }
    },
  );

  it('does not accept missing terms input', () => {
    expect(() => Reflect.apply(saveTermsConsent, undefined, [])).toThrow(TypeError);
    expect(hasUnifiedConsent()).toBe(false);
  });

  it('propagates inaccessible storage instead of returning an accepted fallback', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });
    expect(() => getUnifiedConsent()).toThrow('Consent storage');
    expect(() => saveAnalyticsConsent(true)).toThrow('Consent storage');
  });

  it('keeps legacy refusal intact if persisting the canonical record fails', () => {
    localStorage.setItem('mirrorbuddy-consent', JSON.stringify(oldCookie));
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    expect(() => migrateLegacyConsentKeys()).toThrow('Storage full');
    expect(JSON.parse(localStorage.getItem('mirrorbuddy-consent')!)).toEqual(oldCookie);
    expect(localStorage.getItem(UNIFIED_CONSENT_KEY)).toBeNull();
  });

  it('allows a new analytics choice after rejecting a synthetic old migration', async () => {
    setConsentTestAccount(true);
    localStorage.setItem(
      UNIFIED_CONSENT_KEY,
      JSON.stringify({
        version: '1.0',
        tos: { accepted: true, version: 'legacy', acceptedAt: date },
        cookies: { essential: true, analytics: true, acceptedAt: date },
      }),
    );
    expect(hasAnalyticsConsent()).toBe(false);
    await syncUnifiedConsentToServer(saveAnalyticsConsent(true));
    expect(hasAnalyticsConsent()).toBe(true);
    expect(hasUnifiedConsent()).toBe(false);
    expect(getUnifiedConsent()?.tos.accepted).toBeNull();
  });

  it('does not replace explicit null analytics version with the outer structure version', () => {
    const result = migrateConsent({
      unified: {
        version: CONSENT_VERSION,
        tos: { accepted: true, version: '1.0', acceptedAt: date },
        cookies: { ...oldCookie, analytics: true, version: null },
      },
    });
    expect(result.consent?.cookies.analytics).toBeNull();
    expect(result.consent?.cookies.version).toBe('');
    expect(result.consent?.tos.accepted).toBe(true);
  });

  it('normalizes server envelopes through the actual storage bridge without network calls', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    saveAnalyticsConsent(false);
    const result = consentFromServer(
      { accepted: true, version: '1.0', acceptedAt: date },
      { consent: { ...oldCookie, analytics: true }, analyticsAllowed: true },
    );
    expect(result?.tos.accepted).toBe(true);
    expect(result?.tos.acceptedAt).toBe(date);
    expect(result?.cookies.analytics).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not mutate source fixtures', () => {
    const source = Object.freeze({ cookies: Object.freeze({ ...oldCookie }) });
    expect(() => migrateConsent(source)).not.toThrow();
    expect(source.cookies).toEqual(oldCookie);
  });

  it('reads safely without browser storage on the server', () => {
    vi.stubGlobal('window', undefined);
    expect(getUnifiedConsent()).toBeNull();
    expect(hasUnifiedConsent()).toBe(false);
    expect(hasAnalyticsConsent()).toBe(false);
    expect(migrateLegacyConsentKeys()).toBe(false);
  });
});
