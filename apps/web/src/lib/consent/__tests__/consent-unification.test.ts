import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as storage from '../unified-consent-storage';
import * as cookies from '../consent-storage';
import * as service from '../consent-service';
import { migrateLegacyConsentKeys } from '../consent-migration';
import { clearTrialConsent, hasTrialConsent, setTrialConsent } from '../trial-consent';
import { TOS_VERSION } from '@/lib/tos/constants';
import { installConsentTransportMock, setConsentTestAccount } from './consent-test-transport';

const key = 'mirrorbuddy-unified-consent';
const timestamp = '2026-02-01T10:00:00.000Z';
const later = '2026-02-02T10:00:00.000Z';
const unified = (analytics: boolean = true, accepted: boolean = true) => ({
  version: '1.0',
  tos: { accepted, version: TOS_VERSION, acceptedAt: timestamp },
  cookies: { essential: true, analytics, acceptedAt: timestamp },
});
const legacy = (analytics: boolean = false) => ({
  version: '1.0',
  essential: true,
  analytics,
  marketing: false,
  acceptedAt: timestamp,
});

describe('one canonical consent contract', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    setConsentTestAccount();
    installConsentTransportMock(true);
  });

  it('migrates cookie refusal without manufacturing terms acceptance or timestamps', () => {
    localStorage.setItem('mirrorbuddy-consent', JSON.stringify(legacy()));
    expect(migrateLegacyConsentKeys()).toBe(true);
    const result = storage.getUnifiedConsent();
    expect(result?.cookies.analytics).toBe(false);
    expect(result?.cookies.acceptedAt).toBe(timestamp);
    expect(result?.tos).toEqual({ accepted: null, version: '', acceptedAt: '' });
    expect(storage.hasUnifiedConsent()).toBe(false);
  });

  it('migrates session terms with its actual version and no invented date or analytics', () => {
    sessionStorage.setItem('tos_accepted', 'true');
    sessionStorage.setItem('tos_accepted_version', TOS_VERSION);
    migrateLegacyConsentKeys();
    expect(storage.getUnifiedConsent()?.tos).toEqual({
      accepted: true,
      version: TOS_VERSION,
      acceptedAt: '',
    });
    expect(storage.hasUnifiedConsent()).toBe(true);
    expect(storage.hasAnalyticsConsent()).toBe(false);
  });

  it('never treats a version alone as terms acceptance', () => {
    sessionStorage.setItem('tos_accepted_version', TOS_VERSION);
    migrateLegacyConsentKeys();
    expect(storage.hasUnifiedConsent()).toBe(false);
    expect(storage.hasAnalyticsConsent()).toBe(false);
  });

  it.each([true, false])('does not convert trial accepted=%s into either decision', (accepted) => {
    localStorage.setItem(
      'trialConsent',
      JSON.stringify({
        accepted,
        version: '1.0',
        acceptedAt: timestamp,
      }),
    );
    migrateLegacyConsentKeys();
    expect(storage.hasUnifiedConsent()).toBe(false);
    expect(storage.hasAnalyticsConsent()).toBe(false);
    expect(hasTrialConsent()).toBe(false);
  });

  it.each([true, false])('preserves refusal in either cookie representation (%s)', (reverse) => {
    localStorage.setItem(key, JSON.stringify(unified(reverse)));
    localStorage.setItem('mirrorbuddy-consent', JSON.stringify(legacy(!reverse)));
    migrateLegacyConsentKeys();
    expect(storage.hasAnalyticsConsent()).toBe(false);
    expect(cookies.hasAnalyticsConsent()).toBe(false);
    expect(service.hasAnalyticsConsent()).toBe(false);
    expect(storage.hasUnifiedConsent()).toBe(true);
  });

  it.each([true, false])('preserves terms refusal in either representation (%s)', (reverse) => {
    localStorage.setItem(key, JSON.stringify(unified(true, reverse)));
    sessionStorage.setItem('tos_accepted', String(!reverse));
    sessionStorage.setItem('tos_accepted_version', TOS_VERSION);
    migrateLegacyConsentKeys();
    expect(storage.getUnifiedConsent()?.tos.accepted).toBe(false);
    expect(storage.hasUnifiedConsent()).toBe(false);
    expect(hasTrialConsent()).toBe(false);
    expect(storage.getUnifiedConsent()?.cookies.analytics).toBe(true);
    expect(storage.hasAnalyticsConsent()).toBe(false);
  });

  it('normalizes the extended service representation without retaining extra fields', () => {
    localStorage.setItem(
      key,
      JSON.stringify({
        ...unified(false),
        trial: { accepted: true, acceptedAt: timestamp },
        cookies: { ...unified(false).cookies, marketing: true },
        userId: 'must-not-survive',
        locale: 'it',
        jurisdiction: 'IT',
      }),
    );
    const result = storage.getUnifiedConsent();
    expect(Object.keys(result!)).toEqual(['version', 'tos', 'cookies']);
    expect(Object.keys(result!.cookies)).toEqual([
      'essential',
      'analytics',
      'version',
      'acceptedAt',
    ]);
    expect(JSON.stringify(result)).not.toMatch(/marketing|trial|userId|locale|jurisdiction/);
    expect(result?.tos.acceptedAt).toBe(timestamp);
  });

  it.each([null, [], {}, 'invalid-json', { tos: null, cookies: null }])(
    'handles invalid stored input without accepting: %j',
    (value) => {
      localStorage.setItem(key, value === 'invalid-json' ? value : JSON.stringify(value));
      expect(() => storage.getUnifiedConsent()).not.toThrow();
      expect(storage.hasUnifiedConsent()).toBe(false);
      expect(storage.hasAnalyticsConsent()).toBe(false);
      expect(hasTrialConsent()).toBe(false);
    },
  );

  it.each(['false', 1, {}, null])('does not coerce malformed analytics %j', (analytics) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        ...unified(),
        cookies: { ...unified().cookies, analytics },
      }),
    );
    expect(storage.hasAnalyticsConsent()).toBe(false);
    expect(storage.hasUnifiedConsent()).toBe(true);
  });

  it('keeps unknown form versions and dates from enabling analytics', () => {
    localStorage.setItem(
      'mirrorbuddy-consent',
      JSON.stringify({
        ...legacy(true),
        version: 'future',
        acceptedAt: 'not-a-date',
      }),
    );
    migrateLegacyConsentKeys();
    expect(storage.hasAnalyticsConsent()).toBe(false);
    expect(storage.getUnifiedConsent()?.cookies.version).toBe('future');
    expect(storage.getUnifiedConsent()?.cookies.acceptedAt).toBe('');
  });

  it('does not force renewed terms acceptance for the existing supported version', () => {
    localStorage.setItem(key, JSON.stringify(unified(false)));
    expect(storage.hasUnifiedConsent()).toBe(true);
    expect(storage.needsReconsent()).toBe(false);
    expect(storage.getUnifiedConsent()?.version).toBe('1.0');
  });

  it('preserves an outdated terms version rather than upgrading its acceptance', () => {
    localStorage.setItem(
      key,
      JSON.stringify({
        ...unified(false),
        tos: { ...unified().tos, version: '0.9' },
      }),
    );
    expect(storage.hasUnifiedConsent()).toBe(false);
    expect(storage.needsReconsent()).toBe(true);
    expect(storage.getUnifiedConsent()?.tos.version).toBe('0.9');
  });

  it('migration is byte-stable and does not mint new decision timestamps', () => {
    localStorage.setItem('mirrorbuddy-consent', JSON.stringify(legacy(false)));
    expect(migrateLegacyConsentKeys()).toBe(true);
    const first = localStorage.getItem(key);
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(later);
    expect(migrateLegacyConsentKeys()).toBe(false);
    expect(localStorage.getItem(key)).toBe(first);
  });

  it.each([
    ['unified storage', storage.saveUnifiedConsent],
    ['flat adapter', cookies.saveConsent],
    ['service adapter', service.saveConsent],
  ])('%s writes analytics only and uses the existing canonical key', async (_name, save) => {
    setConsentTestAccount(true);
    save(true);
    expect(storage.hasUnifiedConsent()).toBe(false);
    expect(storage.hasAnalyticsConsent()).toBe(false);
    await storage.retryConsentSync('analytics');
    expect(storage.hasAnalyticsConsent()).toBe(true);
    expect(localStorage.getItem(key)).not.toBeNull();
    expect(localStorage.getItem('mirrorbuddy-consent')).toBeNull();
  });

  it('changing analytics cannot accept refused terms or rewrite their timestamp', () => {
    localStorage.setItem(key, JSON.stringify(unified(false, false)));
    storage.saveUnifiedConsent(true);
    expect(storage.getUnifiedConsent()?.tos).toEqual(unified(false, false).tos);
    expect(hasTrialConsent()).toBe(false);
  });

  it('default analytics writes never opt in', () => {
    storage.saveUnifiedConsent();
    expect(storage.hasAnalyticsConsent()).toBe(false);
    expect(storage.hasUnifiedConsent()).toBe(false);
  });

  it('explicit trial terms acceptance preserves optional refusal and permits study', () => {
    cookies.saveConsent(false);
    setTrialConsent();
    expect(storage.hasUnifiedConsent()).toBe(true);
    expect(hasTrialConsent()).toBe(true);
    expect(storage.hasAnalyticsConsent()).toBe(false);
    expect(localStorage.getItem('trialConsent')).toBeNull();
    clearTrialConsent();
    expect(hasTrialConsent()).toBe(false);
    expect(storage.hasAnalyticsConsent()).toBe(false);
  });

  it('refusal followed by explicit fresh analytics acceptance is not undone by stale keys', async () => {
    setConsentTestAccount(true);
    localStorage.setItem('mirrorbuddy-consent', JSON.stringify(legacy(false)));
    migrateLegacyConsentKeys();
    await storage.syncUnifiedConsentToServer(storage.saveUnifiedConsent(true));
    expect(storage.hasAnalyticsConsent()).toBe(true);
    migrateLegacyConsentKeys();
    expect(storage.hasAnalyticsConsent()).toBe(true);
  });
});
