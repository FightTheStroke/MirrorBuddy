import { TOS_VERSION } from '@/lib/tos/constants';
import {
  CONSENT_VERSION,
  emptyConsent,
  hasAcceptedTerms,
  assertConsentChoice,
  isConsentTimestamp,
  type UnifiedConsentData,
  type ConsentPurpose,
  type ConsentIdentity,
} from './unified-consent';
import { clearStoredConsent } from './consent-migration';
import {
  ConsentSyncError,
  analyticsDenied,
  consentClearing,
  currentRevision,
  decisionFor,
  denyConsent,
  failConsent,
  getConsentSyncSnapshot,
  getConsentIdentity,
  hasConfirmedAnalyticsPermission,
  readConsent,
  resetConsentRuntime,
  restoreFailedWrites,
  stageConsent,
  subscribeToConsentState,
  updateConsentState,
} from './consent-sync-state';
import { deliverConsent, type ConsentIntent } from './consent-transport';
import { initializeConsent, resetConsentInitialization } from './consent-initialization';

export type { UnifiedConsentData } from './unified-consent';
export { ConsentSyncError, getConsentSyncSnapshot } from './consent-sync-state';
export {
  consentFromServer,
  initializeConsent,
  isConsentLoaded,
  loadUnifiedConsentFromDB,
  markConsentLoaded,
} from './consent-initialization';
export const getUnifiedConsent = readConsent;
const intents = new WeakMap<UnifiedConsentData, ConsentIntent>();
const contexts = new Map<ConsentPurpose, ConsentIdentity>();
let pendingClear: 'all' | 'terms' | null = null;

export function hasUnifiedConsent(): boolean {
  try {
    const state = getConsentSyncSnapshot();
    return (
      !consentClearing() &&
      state.status !== 'loading' &&
      state.error?.scope !== 'initialization' &&
      hasAcceptedTerms(getUnifiedConsent())
    );
  } catch {
    return false;
  } // readConsent records the failure for the UI.
}
function saveDecision(purpose: ConsentPurpose, accepted: boolean): UnifiedConsentData {
  assertConsentChoice(accepted);
  const decision = {
    accepted,
    version: purpose === 'terms' ? TOS_VERSION : CONSENT_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  const identity = getConsentIdentity();
  const pending = purpose === 'analytics' || (accepted && identity.account !== null);
  let consent: UnifiedConsentData;
  try {
    consent = stageConsent(purpose, decision, pending);
  } finally {
    contexts.set(purpose, identity);
  }
  intents.set(consent, {
    purpose,
    decision: decisionFor(consent, purpose),
    revision: currentRevision(purpose),
    identity,
  });
  if (!pending)
    updateConsentState({
      confirmations: { ...getConsentSyncSnapshot().confirmations, [purpose]: 'local' },
    });
  return consent;
}
export function saveTermsConsent(accepted: boolean): UnifiedConsentData {
  return saveDecision('terms', accepted);
}
export function saveAnalyticsConsent(analytics: boolean = false): UnifiedConsentData {
  return saveDecision('analytics', analytics);
}
export const saveUnifiedConsent = saveAnalyticsConsent;
export function hasAnalyticsConsent(): boolean {
  try {
    if (!hasConfirmedAnalyticsPermission() || analyticsDenied()) return false;
    const consent = getUnifiedConsent();
    return (
      consent?.cookies.analytics === true &&
      consent.cookies.version === CONSENT_VERSION &&
      isConsentTimestamp(consent.cookies.acceptedAt) &&
      !consent.pending?.includes('analytics')
    );
  } catch (error) {
    if (!(error instanceof ConsentSyncError))
      failConsent(new ConsentSyncError('invalid-response'), 'initialization');
    return false;
  } // Storage failure is visible in getConsentSyncSnapshot().
}
export function subscribeToAnalyticsConsent(listener: (allowed: boolean) => void): () => void {
  const notify = () => listener(hasAnalyticsConsent());
  const unsubscribe = subscribeToConsentState(notify);
  if (typeof window !== 'undefined') window.addEventListener('storage', notify);
  return () => {
    unsubscribe();
    if (typeof window !== 'undefined') window.removeEventListener('storage', notify);
  };
}
export function needsReconsent(): boolean {
  try {
    const consent = getUnifiedConsent();
    return !!consent?.tos.version && consent.tos.version !== TOS_VERSION;
  } catch {
    return false;
  }
}
export async function syncUnifiedConsentToServer(consent: UnifiedConsentData): Promise<void> {
  const intent = consent && intents.get(consent);
  if (!intent) throw new ConsentSyncError('invalid-intent');
  await deliverConsent(intent);
}
export async function retryConsentSync(purpose?: ConsentPurpose): Promise<void> {
  if (pendingClear === 'all') {
    clearUnifiedConsent();
    return;
  }
  if (pendingClear === 'terms' && purpose !== 'analytics') {
    clearTermsConsent();
    return;
  }
  const initializing = getConsentSyncSnapshot().error?.scope === 'initialization';
  if (initializing) await initializeConsent();
  restoreFailedWrites();
  const consent = getUnifiedConsent();
  const purposes =
    consent?.pending?.filter((item) => purpose === undefined || item === purpose) ?? [];
  if (!consent || !purposes.length) {
    if (initializing) return;
    throw new ConsentSyncError('invalid-intent');
  }
  for (const item of purposes) {
    const context = contexts.get(item);
    const identity = getConsentIdentity();
    if (context && context !== identity) throw new ConsentSyncError('superseded');
    await deliverConsent({
      purpose: item,
      decision: decisionFor(consent, item),
      revision: currentRevision(item),
      identity,
    });
  }
}
export function clearUnifiedConsent(): void {
  pendingClear = 'all';
  denyConsent();
  resetConsentInitialization();
  try {
    clearStoredConsent();
  } catch {
    const error = new ConsentSyncError('storage');
    failConsent(error);
    throw error;
  }
  pendingClear = null;
  resetConsentRuntime();
  updateConsentState({ ready: true });
}
/** Clearing a trial/logout marker is not an explicit legal refusal. */
export function clearTermsConsent(): void {
  pendingClear = 'terms';
  const consent = getUnifiedConsent();
  if (consent) stageConsent('terms', emptyConsent().tos, false);
  try {
    if (typeof window !== 'undefined') localStorage.removeItem('trialConsent');
  } catch {
    const error = new ConsentSyncError('storage');
    failConsent(error, 'terms');
    throw error;
  }
  pendingClear = null;
  const confirmations = { ...getConsentSyncSnapshot().confirmations };
  delete confirmations.terms;
  updateConsentState({ pending: getUnifiedConsent()?.pending ?? [], confirmations });
}
export function resetConsentOperations(): void {
  pendingClear = null;
  contexts.clear();
  resetConsentInitialization();
}
