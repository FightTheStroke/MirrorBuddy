import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import type { ExistingUserData } from '../types';

function isTransientFetchError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.name === 'TimeoutError';
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
