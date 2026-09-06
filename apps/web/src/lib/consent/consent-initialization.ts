import {
  CONSENT_LOADED_KEY,
  cookieResponseSchema,
  hasAcceptedTerms,
  termsResponseSchema,
  type ConsentPurpose,
  type ConsentIdentity,
  type UnifiedConsentData,
} from './unified-consent';
import { migrateConsent } from './consent-migration';
import {
  allowConfirmedRead,
  confirmAnalyticsPermission,
  consentClearing,
  ConsentSyncError,
  currentRevision,
  failConsent,
  getConsentSyncSnapshot,
  getConsentIdentity,
  persistConsent,
  readConsent,
  updateConsentState,
} from './consent-sync-state';

let initialization: Promise<boolean> | undefined;
let initializingIdentity: ConsentIdentity | undefined;
let generation = 0;
let initializedIdentity: ConsentIdentity | undefined;

export function consentFromServer(
  terms: unknown,
  cookies: unknown,
  observed?: Readonly<Record<ConsentPurpose, number>>,
): UnifiedConsentData | null {
  const parsedTerms = termsResponseSchema.safeParse(terms);
  const parsedCookies = cookieResponseSchema.safeParse(cookies);
  if (!parsedTerms.success || !parsedCookies.success)
    throw new ConsentSyncError('invalid-response');
  const unchanged = (purpose: ConsentPurpose) =>
    observed?.[purpose] === undefined || observed[purpose] === currentRevision(purpose);
  return migrateConsent({
    unified: readConsent(),
    // GET false means no current acceptance row, not an explicit refusal.
    serverTerms: unchanged('terms') && parsedTerms.data.accepted ? parsedTerms.data : null,
    serverCookies: unchanged('analytics') ? parsedCookies.data : null,
  }).consent;
}
export async function loadUnifiedConsentFromDB(): Promise<UnifiedConsentData | null> {
  const identity = getConsentIdentity();
  if (identity.account === null) return null;
  confirmAnalyticsPermission(identity, false);
  updateConsentState({});
  const current = generation;
  const observed = { terms: currentRevision('terms'), analytics: currentRevision('analytics') };
  const get = async (url: string): Promise<unknown> => {
    let response: Response;
    try {
      response = await fetch(url, { method: 'GET', credentials: 'include' });
    } catch {
      throw new ConsentSyncError('network');
    }
    if (!response.ok) throw new ConsentSyncError('http', response.status);
    try {
      return await response.json();
    } catch {
      throw new ConsentSyncError('invalid-response');
    }
  };
  const terms = await get('/api/tos');
  if (generation !== current || identity !== getConsentIdentity())
    throw new ConsentSyncError('superseded');
  const cookies = await get('/api/user/consent');
  if (generation !== current || identity !== getConsentIdentity())
    throw new ConsentSyncError('superseded');
  const consent = consentFromServer(terms, cookies, observed);
  if (consent) persistConsent(consent);
  const parsed = cookieResponseSchema.safeParse(cookies);
  if (!parsed.success) throw new ConsentSyncError('invalid-response');
  if (currentRevision('analytics') === observed.analytics) {
    confirmAnalyticsPermission(identity, parsed.data.analyticsAllowed);
  }
  updateConsentState({});
  return consent;
}
export async function initializeConsent(): Promise<boolean> {
  if (consentClearing()) return false;
  const identity = getConsentIdentity();
  if (initialization && initializingIdentity === identity) return initialization;
  const current = ++generation;
  initializingIdentity = identity;
  initialization = (async () => {
    const error = getConsentSyncSnapshot().error;
    updateConsentState({
      status: 'loading',
      error: error?.scope === 'initialization' ? null : error,
    });
    try {
      await (isConsentLoaded() ? readConsent() : loadUnifiedConsentFromDB());
      const consent = readConsent();
      if (generation !== current || identity !== getConsentIdentity())
        throw new ConsentSyncError('superseded');
      markConsentLoaded();
      const error = getConsentSyncSnapshot().error;
      if (!error) allowConfirmedRead();
      const pending = consent?.pending ?? [];
      updateConsentState({
        ready: true,
        status: error ? 'error' : pending.length ? 'pending' : 'idle',
        pending,
      });
      return hasAcceptedTerms(consent);
    } catch (error) {
      const failure = error instanceof ConsentSyncError ? error : new ConsentSyncError('storage');
      if (generation === current && identity === getConsentIdentity()) {
        failConsent(failure, 'initialization');
        updateConsentState({ ready: true });
      }
      throw failure;
    } finally {
      if (generation === current) initialization = undefined;
    }
  })();
  return initialization;
}
export function markConsentLoaded(): void {
  if (typeof window !== 'undefined') {
    const identity = getConsentIdentity();
    sessionStorage.setItem(CONSENT_LOADED_KEY, identity.account === null ? 'guest' : 'account');
    initializedIdentity = identity;
  }
}
export function isConsentLoaded(): boolean {
  try {
    const identity = getConsentIdentity();
    return (
      typeof window !== 'undefined' &&
      initializedIdentity === identity &&
      sessionStorage.getItem(CONSENT_LOADED_KEY) ===
        (identity.account === null ? 'guest' : 'account')
    );
  } catch {
    failConsent(new ConsentSyncError('storage'), 'initialization');
    return false;
  }
}
export function resetConsentInitialization(): void {
  generation++;
  initialization = undefined;
  initializingIdentity = undefined;
  initializedIdentity = undefined;
}
