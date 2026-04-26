import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import type { ExistingUserData } from '../types';

export function useExistingUserData() {
  const [existingUserData, setExistingUserData] = useState<ExistingUserData | null>(null);
  const [hasCheckedExistingData, setHasCheckedExistingData] = useState(false);
  const { updateData } = useOnboardingStore();

  useEffect(() => {
    async function fetchExistingData() {
      try {
        const response = await fetch('/api/onboarding');
        const data = await response.json();

        if (data.hasExistingData && data.data) {
          setExistingUserData(data.data);
          if (data.data.name) {
            updateData({ name: data.data.name });
          }
        }

        setHasCheckedExistingData(true);
      } catch (error) {
        logger.error('[WelcomePage] Failed to fetch existing data', { error: String(error) });
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

