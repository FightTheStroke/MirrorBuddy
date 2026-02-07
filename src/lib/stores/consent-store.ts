// ============================================================================
// CONSENT STORE - Analytics and data collection consent management
// ============================================================================

import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/auth';

// ============================================================================
// TYPES
// ============================================================================

export interface ConsentState {
  parentConsent: boolean;
  studentConsent: boolean;
  consentDate: Date | null;
  isLoaded: boolean;
  isLoading: boolean;

  // Check if analytics consent is given (either parent or student)
  hasAnalyticsConsent: () => boolean;

  // Actions
  loadConsent: (userId: string) => Promise<void>;
  updateConsent: (
    userId: string,
    parentConsent?: boolean,
    studentConsent?: boolean
  ) => Promise<void>;
  setAnalyticsConsent: (
    userId: string,
    consent: boolean,
    givenBy: 'parent' | 'student'
  ) => Promise<void>;
  reset: () => void;
}

// ============================================================================
// STORE
// ============================================================================

const initialState = {
  parentConsent: false,
  studentConsent: false,
  consentDate: null,
  isLoaded: false,
  isLoading: false,
};

export const useConsentStore = create<ConsentState>((set, get) => ({
  ...initialState,

  hasAnalyticsConsent: () => {
    const state = get();
    return state.parentConsent || state.studentConsent;
  },

  loadConsent: async (userId: string) => {
    set({ isLoading: true });
    try {
      const response = await csrfFetch(
        `/api/profile/consent?userId=${encodeURIComponent(userId)}`
      );

      if (!response.ok) {
        logger.warn('Failed to load consent', { status: response.status });
        set({ isLoaded: true, isLoading: false });
        return;
      }

      const data = await response.json();
      if (data.success && data.data) {
        set({
          parentConsent: data.data.parentConsent ?? false,
          studentConsent: data.data.studentConsent ?? false,
          consentDate: data.data.consentDate
            ? new Date(data.data.consentDate)
            : null,
          isLoaded: true,
          isLoading: false,
        });

        logger.info('Consent loaded', {
          parentConsent: data.data.parentConsent,
          studentConsent: data.data.studentConsent,
        });
      } else {
        set({ isLoaded: true, isLoading: false });
      }
    } catch (error) {
      logger.error('Consent load failed', { error: String(error) });
      set({ isLoaded: true, isLoading: false });
    }
  },

  updateConsent: async (
    userId: string,
    parentConsent?: boolean,
    studentConsent?: boolean
  ) => {
    try {
      const response = await csrfFetch('/api/profile/consent', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          parentConsent,
          studentConsent,
          consentGivenBy: 'user',
        }),
      });

      if (!response.ok) {
        logger.warn('Failed to update consent', { status: response.status });
        return;
      }

      const data = await response.json();
      if (data.success && data.data) {
        set({
          parentConsent: data.data.parentConsent ?? false,
          studentConsent: data.data.studentConsent ?? false,
          consentDate: new Date(data.data.consentDate),
        });

        logger.info('Consent updated', {
          parentConsent: data.data.parentConsent,
          studentConsent: data.data.studentConsent,
        });
      }
    } catch (error) {
      logger.error('Consent update failed', { error: String(error) });
    }
  },

  setAnalyticsConsent: async (
    userId: string,
    consent: boolean,
    givenBy: 'parent' | 'student'
  ) => {
    const updateData =
      givenBy === 'parent'
        ? { parentConsent: consent }
        : { studentConsent: consent };

    await get().updateConsent(userId, updateData.parentConsent, updateData.studentConsent);
  },

  reset: () => set(initialState),
}));
