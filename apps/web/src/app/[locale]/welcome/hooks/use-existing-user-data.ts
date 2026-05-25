import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import type { ExistingUserData } from '../types';

function isTransientFetchError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  if (error instanceof Error) {
    // AbortError/TimeoutError: client cancellation; TypeError: network unreachable
    // / DNS / CORS-blocked; messages containing "5" suggest 5xx surfaced via
    // throw `new Error('/api/onboarding 5xx')`. All treated as transient to
    // avoid Sentry alerts on infra hiccups (MIRRORBUDDY-1T).
    if (
      error.name === 'AbortError' ||
      error.name === 'TimeoutError' ||
      error.name === 'TypeError'
    ) {
      return true;
    }
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
