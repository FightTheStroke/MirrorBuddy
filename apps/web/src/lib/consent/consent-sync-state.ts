import { logger } from '@/lib/logger';
import { getUserIdFromCookie } from '@/lib/auth';
import { subscribeClientIdentity } from '@/lib/auth/client-auth';
import { readStoredConsent } from './consent-migration';
import {
  UNIFIED_CONSENT_KEY,
  emptyConsent,
  decisionFor,
  withDecision,
  ConsentSyncError,
  type ConsentDecision,
  type ConsentPurpose,
  type UnifiedConsentData,
  type ConsentIdentity,
  type ConsentSyncSnapshot,
} from './unified-consent';
export { decisionFor, ConsentSyncError } from './unified-consent';
export type { ConsentErrorCode, ConsentSyncSnapshot } from './unified-consent';
const initial = (): ConsentSyncSnapshot => ({
  ready: false,
  status: 'idle',
  pending: [],
  error: null,
  confirmations: {},
});
let snapshot = initial();
const serverSnapshot = initial();
let draft: UnifiedConsentData | undefined;
let lastKnown: UnifiedConsentData | null = null;
let denied = false;
let clearing = false;
// Transient context binding only; real server auth and eligibility remain authoritative.
let analyticsIdentity: ConsentIdentity | null = null;
let identity: ConsentIdentity | undefined;
let identityGeneration = 0;
let revision = 0;
const revisions = { terms: 0, analytics: 0 };
const failedWrites = new Map<ConsentPurpose, ConsentDecision>();
const listeners = new Set<() => void>();

export const getConsentSyncSnapshot = () => snapshot;
export const getServerConsentSyncSnapshot = () => serverSnapshot;
export const consentClearing = () => clearing;
export function subscribeToConsentState(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function updateConsentState(update: Partial<ConsentSyncSnapshot>): void {
  snapshot = { ...snapshot, ...update };
  listeners.forEach((listener) => listener());
}
export function failConsent(
  error: ConsentSyncError,
  scope?: ConsentPurpose | 'initialization',
): void {
  denied = true;
  if (
    snapshot.error?.code === error.code &&
    snapshot.error.status === error.status &&
    snapshot.error.scope === scope
  )
    return;
  logger.warn('Consent operation failed', { code: error.code, status: error.status });
  updateConsentState({
    status: 'error',
    error: { code: error.code, status: error.status, retryable: error.retryable, scope },
  });
}
export const analyticsDenied = () => denied;
export function getConsentIdentity(): ConsentIdentity {
  let account: string | null;
  try {
    account = getUserIdFromCookie();
  } catch {
    // An unresolved read is not a new visitor/account. Keep exact intents bound
    // to their prior generation so a retry on the same confirmed account works.
    analyticsIdentity = null;
    denied = true;
    throw new ConsentSyncError('identity');
  }
  if (identity && identity.account === account) return identity;
  const previous = identity;
  const next = Object.freeze({ account, generation: ++identityGeneration });
  identity = next;
  if (previous) {
    analyticsIdentity = null;
    denied = true;
    revisions.terms = ++revision;
    revisions.analytics = ++revision;
    updateConsentState({ confirmations: {} });
  }
  return next;
}
export function hasConfirmedAnalyticsPermission(): boolean {
  return getConsentIdentity() === analyticsIdentity;
}
export function confirmAnalyticsPermission(expected: ConsentIdentity, allowed: boolean): void {
  if (expected !== getConsentIdentity()) throw new ConsentSyncError('superseded');
  analyticsIdentity = allowed && expected.account ? expected : null;
}
export const currentRevision = (purpose: ConsentPurpose) => revisions[purpose];
export function beginConsent(purpose: ConsentPurpose): number {
  revisions[purpose] = ++revision;
  if (purpose === 'analytics') {
    denied = true;
    analyticsIdentity = null;
  }
  updateConsentState({
    status: snapshot.error && snapshot.error.scope !== purpose ? 'error' : 'pending',
    error: snapshot.error?.scope === purpose ? null : snapshot.error,
    pending: [...new Set([...snapshot.pending, purpose])],
  });
  return revisions[purpose];
}
export function readConsent(): UnifiedConsentData | null {
  if (draft) return draft;
  try {
    lastKnown = readStoredConsent();
    return lastKnown;
  } catch {
    const error = new ConsentSyncError('storage');
    failConsent(error, 'initialization');
    throw error;
  }
}
export function persistConsent(consent: UnifiedConsentData): void {
  try {
    if (typeof window === 'undefined') throw new Error('No browser storage');
    localStorage.setItem(UNIFIED_CONSENT_KEY, JSON.stringify(consent));
  } catch {
    const error = new ConsentSyncError('storage');
    failConsent(error);
    throw error;
  }
  lastKnown = consent;
}
export function stageConsent(
  purpose: ConsentPurpose,
  decision: ConsentDecision,
  pending: boolean,
): UnifiedConsentData {
  beginConsent(purpose);
  let next: UnifiedConsentData;
  let selected = decision;
  try {
    const previous = failedWrites.size ? rebaseFailedWrites() : (readConsent() ?? emptyConsent());
    if (
      purpose === 'terms' &&
      previous.tos.accepted === decision.accepted &&
      previous.tos.version === decision.version &&
      !previous.pending?.includes('terms')
    )
      selected = previous.tos;
    next = withDecision(previous, purpose, selected, pending);
    persistConsent(next);
  } catch {
    failedWrites.set(purpose, selected);
    draft = withDecision(lastKnown ?? emptyConsent(), purpose, selected, true);
    const error = new ConsentSyncError('storage');
    failConsent(error, purpose);
    throw error;
  }
  draft = undefined;
  failedWrites.clear();
  if (purpose === 'terms' && !snapshot.error) allowConfirmedRead();
  updateConsentState({
    pending: next.pending ?? [],
    status: snapshot.error ? 'error' : next.pending?.length ? 'pending' : 'saved',
  });
  return next;
}
export function restoreFailedWrites(): void {
  if (!failedWrites.size) return;
  try {
    const next = rebaseFailedWrites();
    persistConsent(next);
    draft = undefined;
    failedWrites.clear();
    updateConsentState({ pending: next.pending ?? [], status: 'pending', error: null });
  } catch {
    const error = new ConsentSyncError('storage');
    failConsent(error);
    throw error;
  }
}
function rebaseFailedWrites(): UnifiedConsentData {
  let next = readStoredConsent() ?? emptyConsent();
  failedWrites.forEach((decision, purpose) => {
    next = withDecision(next, purpose, decision, true);
  });
  return next;
}
export function confirmConsent(
  purpose: ConsentPurpose,
  expected: ConsentDecision,
  token: number,
  confirmation: 'local' | 'received' | 'persisted',
  acceptedAt = expected.acceptedAt,
): void {
  const consent = readConsent();
  if (
    !consent ||
    currentRevision(purpose) !== token ||
    JSON.stringify(decisionFor(consent, purpose)) !== JSON.stringify(expected)
  ) {
    throw new ConsentSyncError('superseded');
  }
  const next = withDecision(consent, purpose, { ...expected, acceptedAt }, false);
  persistConsent(next);
  const error = snapshot.error?.scope === purpose ? null : snapshot.error;
  if (!error) allowConfirmedRead();
  updateConsentState({
    status: error ? 'error' : next.pending?.length ? 'pending' : 'saved',
    error,
    pending: next.pending ?? [],
    confirmations: { ...snapshot.confirmations, [purpose]: confirmation },
  });
}
export function resetConsentRuntime(): void {
  revisions.terms = ++revision;
  revisions.analytics = ++revision;
  draft = undefined;
  lastKnown = null;
  denied = false;
  clearing = false;
  analyticsIdentity = null;
  identity = undefined;
  failedWrites.clear();
  snapshot = initial();
  listeners.forEach((listener) => listener());
}
export function denyConsent(): void {
  denied = true;
  clearing = true;
  analyticsIdentity = null;
  revisions.terms = ++revision;
  revisions.analytics = ++revision;
  updateConsentState({ pending: [], error: null, confirmations: {}, status: 'idle' });
}
export function allowConfirmedRead(): void {
  if (!clearing) denied = false;
}

subscribeClientIdentity(() => {
  try {
    getConsentIdentity();
  } catch {
    analyticsIdentity = null;
    denied = true;
  }
  updateConsentState({});
});
