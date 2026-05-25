import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import type { ExistingUserData } from '../types';

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
  const [existingUserData, setExistingUserData] = useState<ExistingUserData | null>(null);
  const [hasCheckedExistingData, setHasCheckedExistingData] = useState(false);
  const { updateData } = useOnboardingStore();

  useEffect(() => {
    async function fetchExistingData() {
      try {
        const response = await fetch('/api/onboarding');
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            // Anonymous visitor — expected, no Sentry noise
            setHasCheckedExistingData(true);
            return;
          }
          throw new Error(`/api/onboarding ${response.status}`);
        }
        const data = await response.json();

        if (data.hasExistingData && data.data) {
          setExistingUserData(data.data);
          if (data.data.name) {
            updateData({ name: data.data.name });
          }
        }

        setHasCheckedExistingData(true);
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
        setHasCheckedExistingData(true);
      }
    }
    fetchExistingData();
  }, [updateData]);

  return {
    existingUserData,
    hasCheckedExistingData,
  };
}
