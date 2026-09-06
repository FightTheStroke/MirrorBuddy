import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import type { ExistingUserData } from '../types';
import { getClientIdentity } from '@/lib/auth/client-auth';
import { useClientIdentity } from '@/lib/auth/identity-provider';

function isTransientFetchError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return true;
    }
    // Narrow TypeError to fetch/network signatures. Browsers throw TypeError
    // with messages like 'Failed to fetch', 'NetworkError when attempting to
    // fetch', or 'Load failed' (Safari) for network failures. Avoid blanket
    // TypeError suppression so genuine bugs (e.g. null dereferences post-fetch)
    // still surface (MIRRORBUDDY-1T, PR #408 P2).
    if (error.name === 'TypeError' && /fetch|network|load failed/i.test(error.message)) {
      return true;
    }
    // 5xx surfaced via `throw new Error('/api/onboarding 5xx')` is server-side
    // and treated as transient (no client bug).
    if (/\b5\d{2}\b/.test(error.message)) {
      return true;
    }
  }
  return false;
}

export function useExistingUserData() {
  const identity = useClientIdentity();
  const [existingUserData, setExistingUserData] = useState<ExistingUserData | null>(null);
  const [hasCheckedExistingData, setHasCheckedExistingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateData } = useOnboardingStore();

  useEffect(() => {
    async function fetchExistingData() {
      try {
        if (identity.status === 'anonymous') {
          setExistingUserData(null);
          setHasCheckedExistingData(true);
          return;
        }
        if (identity.status !== 'authenticated') return;
        const response = await fetch('/api/onboarding');
        if (!response.ok) {
          throw new Error(`/api/onboarding ${response.status}`);
        }
        const data = await response.json();
        if (getClientIdentity() !== identity) return;

        if (data.hasExistingData && data.data) {
          setExistingUserData(data.data);
          if (data.data.name) {
            updateData({ name: data.data.name });
          }
        }

        setHasCheckedExistingData(true);
        setError(null);
      } catch (error) {
        if (isTransientFetchError(error)) {
          logger.debug('[WelcomePage] Existing-data fetch aborted (transient)', {
            errorName: error instanceof Error ? error.name : typeof error,
          });
        } else {
          logger.error(
            '[WelcomePage] Failed to fetch existing data',
            { component: 'WelcomePage' },
            error instanceof Error ? error : new Error(String(error)),
          );
        }
        setError('ONBOARDING_UNAVAILABLE');
      }
    }
    fetchExistingData();
  }, [updateData, identity]);

  return {
    existingUserData,
    hasCheckedExistingData:
      (identity.status === 'authenticated' || identity.status === 'anonymous') &&
      hasCheckedExistingData,
    error: identity.status === 'unavailable' ? identity.reason : error,
  };
}
