import {
  hasUnifiedConsent,
  initializeConsent,
  resetConsentOperations,
} from './unified-consent-storage';
import {
  ConsentSyncError,
  failConsent,
  getConsentSyncSnapshot,
  getServerConsentSyncSnapshot,
  resetConsentRuntime,
  subscribeToConsentState,
  updateConsentState,
} from './consent-sync-state';

export { getConsentSyncSnapshot, getServerConsentSyncSnapshot, subscribeToConsentState };
export const subscribeToConsent = subscribeToConsentState;
let started = false;
export function getConsentSnapshot(): boolean {
  if (!started) {
    started = true;
    if (!getConsentSyncSnapshot().ready) {
      void initializeConsent().catch((error) => {
        if (error instanceof ConsentSyncError && error.code === 'superseded') return;
        failConsent(
          error instanceof ConsentSyncError ? error : new ConsentSyncError('network'),
          'initialization',
        );
      });
    }
  }
  return hasUnifiedConsent();
}
export function getServerConsentSnapshot(): boolean {
  return false;
}
export function updateConsentSnapshot(_consented: boolean): void {
  // The compatibility notification cannot manufacture mandatory terms acceptance.
  updateConsentState({ ready: true });
}
export function resetConsentSnapshot(): void {
  started = false;
  resetConsentOperations();
  resetConsentRuntime();
}
