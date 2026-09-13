'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { clientLogger } from '@/lib/logger/client';
import {
  getConsentSyncSnapshot,
  getServerConsentSyncSnapshot,
  subscribeToConsentState,
} from '@/lib/consent/consent-store';
import {
  ConsentSyncError,
  getUnifiedConsent,
  hasAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from '@/lib/consent/unified-consent-storage';
import type { ConsentPurpose, UnifiedConsentData } from '@/lib/consent/unified-consent';

export function useConsentUI() {
  const snapshot = useSyncExternalStore(
    subscribeToConsentState,
    getConsentSyncSnapshot,
    getServerConsentSyncSnapshot,
  );
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [consent, setConsent] = useState<UnifiedConsentData | null>(null);
  const [readFailure, setReadFailure] = useState<unknown>(null);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const [invalidPurposes, setInvalidPurposes] = useState<ConsentPurpose[]>([]);
  const [completing, setCompleting] = useState(false);
  const [completionFailure, setCompletionFailure] = useState<Error | null>(null);
  const refreshConsent = useCallback(() => {
    try {
      setConsent(getUnifiedConsent());
      setReadFailure(null);
    } catch (error) {
      setReadFailure(error);
    }
  }, []);
  useEffect(() => {
    // Storage events may change the choice without changing permission or the technical snapshot.
    const unsubscribe = subscribeToAnalyticsConsent((allowed) => {
      setAnalyticsAllowed(allowed);
      refreshConsent();
    });
    setAnalyticsAllowed(hasAnalyticsConsent());
    return unsubscribe;
  }, [refreshConsent]);
  useEffect(refreshConsent, [snapshot, refreshConsent]);
  const runCompletion = useCallback(async (operation: () => void | Promise<void>) => {
    setCompleting(true);
    setCompletionFailure(null);
    try {
      await operation();
      return true;
    } catch (error) {
      clientLogger.error('Consent follow-up operation failed', { component: 'ConsentUI' }, error);
      setCompletionFailure(error instanceof Error ? error : new Error('Consent follow-up failed'));
      return false;
    } finally {
      setCompleting(false);
    }
  }, []);
  const run = useCallback(
    async (
      operation: () => void | Promise<void>,
      purpose?: ConsentPurpose,
      newDecision = false,
    ) => {
      setBusy(true);
      setFailure(null);
      setCompletionFailure(null);
      const releasePreviousIntent = () => {
        if (newDecision && purpose) {
          setInvalidPurposes((current) => current.filter((item) => item !== purpose));
        }
      };
      try {
        await operation();
        releasePreviousIntent();
        return true;
      } catch (error) {
        clientLogger.error('Consent UI operation failed', { component: 'ConsentUI' }, error);
        // A staged fresh intent may retry; a pre-intent identity failure must not revive the old choice.
        if (
          error instanceof ConsentSyncError &&
          error.code !== 'superseded' &&
          getConsentSyncSnapshot().error?.scope === purpose
        ) {
          releasePreviousIntent();
        }
        if (error instanceof ConsentSyncError && error.code === 'superseded') {
          setInvalidPurposes((current) => [
            ...new Set([
              ...current,
              ...getConsentSyncSnapshot().pending,
              ...(purpose ? [purpose] : []),
            ]),
          ]);
        }
        setFailure(
          error instanceof ConsentSyncError &&
            error.code !== 'superseded' &&
            getConsentSyncSnapshot().error
            ? null
            : error instanceof Error
              ? error
              : new Error('Consent operation failed'),
        );
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );
  return {
    snapshot,
    consent,
    busy,
    failure: failure ?? readFailure,
    run,
    analyticsAllowed,
    invalidPurposes,
    completing,
    completionFailure,
    runCompletion,
  };
}
