/**
 * Onboarding Store
 *
 * Manages the onboarding flow state:
 * - Track if user has completed onboarding
 * - Current step in the flow
 * - Collected data during onboarding
 */

import { create } from 'zustand';
import { csrfFetch } from '@/lib/auth';
import { AUTH_COOKIE_NAME } from '@/lib/auth';
import {
  getUserIdFromCookie,
  requireClientUserId,
  setClientIdentity,
} from '@/lib/auth/client-auth';
import { logger } from '@/lib/logger';
import {
  type OnboardingStep,
  type OnboardingData,
  type VoiceTranscriptEntry,
  STEP_ORDER,
} from './onboarding-types';

export type { OnboardingStep, OnboardingData, VoiceTranscriptEntry };
export { getStepIndex, getTotalSteps } from './onboarding-types';

interface OnboardingState {
  // Flow state
  hasCompletedOnboarding: boolean;
  onboardingCompletedAt: string | null;
  currentStep: OnboardingStep;
  isReplayMode: boolean;
  isVoiceMuted: boolean;
  isHydrated: boolean; // True after we've checked the DB
  hydratedUserId: string | null | undefined;

  // Voice session state
  voiceSessionActive: boolean;
  voiceSessionConnecting: boolean;
  voiceTranscript: VoiceTranscriptEntry[];
  azureAvailable: boolean | null; // null = not checked yet

  // Collected data
  data: OnboardingData;

  // Actions
  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (data: Partial<OnboardingData>) => void;
  setVoiceMuted: (muted: boolean) => void;
  setVoiceSessionActive: (active: boolean) => void;
  setVoiceSessionConnecting: (connecting: boolean) => void;
  addVoiceTranscript: (role: 'user' | 'assistant', text: string) => void;
  clearVoiceTranscript: () => void;
  setAzureAvailable: (available: boolean) => void;
  completeOnboarding: () => void;
  startReplay: () => void;
  resetOnboarding: () => void;
  resetAllData: () => Promise<void>;
  hydrateFromApi: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  hasCompletedOnboarding: false,
  onboardingCompletedAt: null,
  currentStep: 'welcome',
  isReplayMode: false,
  isVoiceMuted: false,
  isHydrated: false,
  hydratedUserId: undefined,

  // Voice session state
  voiceSessionActive: false,
  voiceSessionConnecting: false,
  voiceTranscript: [],
  azureAvailable: null,

  data: {
    name: '',
  },

  setStep: (step) => set({ currentStep: step }),

  setVoiceMuted: (muted) => set({ isVoiceMuted: muted }),

  setVoiceSessionActive: (active) => set({ voiceSessionActive: active }),

  setVoiceSessionConnecting: (connecting) => set({ voiceSessionConnecting: connecting }),

  addVoiceTranscript: (role, text) =>
    set((state) => ({
      voiceTranscript: [...state.voiceTranscript, { role, text, timestamp: Date.now() }],
    })),

  clearVoiceTranscript: () => set({ voiceTranscript: [] }),

  setAzureAvailable: (available) => set({ azureAvailable: available }),

  nextStep: () => {
    const currentIndex = STEP_ORDER.indexOf(get().currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      set({ currentStep: STEP_ORDER[currentIndex + 1] });
    }
  },

  prevStep: () => {
    const currentIndex = STEP_ORDER.indexOf(get().currentStep);
    if (currentIndex > 0) {
      set({ currentStep: STEP_ORDER[currentIndex - 1] });
    }
  },

  updateData: (data) =>
    set((state) => ({
      data: { ...state.data, ...data },
    })),

  completeOnboarding: () =>
    set({
      hasCompletedOnboarding: true,
      onboardingCompletedAt: new Date().toISOString(),
      isReplayMode: false,
    }),

  startReplay: () =>
    set({
      currentStep: 'welcome',
      isReplayMode: true,
    }),

  resetOnboarding: () =>
    set({
      hasCompletedOnboarding: false,
      onboardingCompletedAt: null,
      currentStep: 'welcome',
      isReplayMode: false,
      isVoiceMuted: false,
      isHydrated: false,
      voiceSessionActive: false,
      voiceSessionConnecting: false,
      voiceTranscript: [],
      azureAvailable: null,
      data: { name: '' },
    }),

  resetAllData: async () => {
    // Delete all user data from database (primary data source)
    requireClientUserId();
    const response = await csrfFetch('/api/user/data', { method: 'DELETE' });
    if (!response.ok) throw new Error(`Account reset failed (${response.status})`);
    const result: unknown = await response.json();
    if (
      !result ||
      typeof result !== 'object' ||
      !('success' in result) ||
      result.success !== true
    ) {
      throw new Error('Account reset acknowledgement missing');
    }
    setClientIdentity({ status: 'anonymous' });

    // Clear any remaining localStorage (legacy/session data)
    const storeKeys = [
      'mirrorbuddy-settings',
      'mirrorbuddy-progress',
      'mirrorbuddy-conversations',
      'mirrorbuddy-learnings',
      'mirrorbuddy-html-snippets',
      'mirrorbuddy-calendar',
      'mirrorbuddy-onboarding',
      'mirrorbuddy-accessibility',
      'mirrorbuddy-notifications',
      'mirrorbuddy-pomodoro',
      AUTH_COOKIE_NAME,
    ];

    storeKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Clear IndexedDB (legacy materials storage)
    const databases = ['mirrorbuddy-materials', 'mirrorbuddy-flashcards'];
    for (const dbName of databases) {
      try {
        indexedDB.deleteDatabase(dbName);
      } catch {
        // Ignore errors
      }
    }

    get().resetOnboarding();

    // Reload the page to reinitialize everything
    window.location.assign(new URL('/welcome', window.location.origin).href);
  },

  hydrateFromApi: async () => {
    try {
      const userId = getUserIdFromCookie();
      if (get().isHydrated && get().hydratedUserId === userId) return;
      if (userId === null) {
        set({ isHydrated: true, hydratedUserId: null });
        return;
      }
      const response = await fetch('/api/onboarding');
      if (!response.ok) {
        throw new Error(`Onboarding hydration failed (${response.status})`);
      }

      const data = await response.json();
      if (getUserIdFromCookie() !== userId) throw new Error('Onboarding identity changed');

      // Decide whether onboarding is complete.
      // A returning user who already has a real profile (a name) must go
      // straight to the app — NOT be re-forced through onboarding by a stale
      // OnboardingState row with hasCompletedOnboarding=false (e.g. an account
      // created/seeded without the flag ever being set). The previous `??`
      // logic let an explicit `false` win over the "has existing data" signal,
      // which trapped real logged-in users in a /welcome bounce.
      // Replay mode still intentionally forces onboarding (resetOnboarding /
      // startReplay set hasCompletedOnboarding=false to redo the flow).
      const state = data.onboardingState;
      const hasProfileName = Boolean(data.data?.name);
      const isCompleted = state?.isReplayMode
        ? false
        : Boolean(state?.hasCompletedOnboarding) || hasProfileName;

      // Update store with DB state
      set({
        isHydrated: true,
        hydratedUserId: userId,
        hasCompletedOnboarding: isCompleted,
        onboardingCompletedAt: data.onboardingState?.onboardingCompletedAt ?? null,
        currentStep:
          (data.onboardingState?.currentStep as OnboardingStep) ??
          (isCompleted ? 'ready' : 'welcome'),
        isReplayMode: data.onboardingState?.isReplayMode ?? false,
        ...(data.data && {
          data: {
            name: data.data.name ?? '',
            age: data.data.age,
            schoolLevel: data.data.schoolLevel,
            learningDifferences: data.data.learningDifferences,
            gender: data.data.gender,
          },
        }),
      });
    } catch (error) {
      logger.warn('Onboarding hydration failed; prior state retained');
      throw error;
    }
  },
}));
