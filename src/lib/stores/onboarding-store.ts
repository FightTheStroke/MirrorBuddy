/**
 * Onboarding Store
 *
 * Manages the onboarding flow state:
 * - Track if user has completed onboarding
 * - Current step in the flow
 * - Collected data during onboarding
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OnboardingStep =
  | 'welcome' // Step 1: Melissa intro + chiede nome
  | 'info' // Step 2: Info opzionali (skippabile)
  | 'principles' // Step 3: Principi ConvergioEdu
  | 'maestri' // Step 4: Carousel maestri
  | 'ready'; // Step 5: CTA finale

interface OnboardingData {
  name: string;
  age?: number;
  schoolLevel?: 'elementare' | 'media' | 'superiore';
  learningDifferences?: string[];
  gender?: 'male' | 'female' | 'other';
}

interface OnboardingState {
  // Flow state
  hasCompletedOnboarding: boolean;
  onboardingCompletedAt: string | null;
  currentStep: OnboardingStep;
  isReplayMode: boolean;

  // Collected data
  data: OnboardingData;

  // Actions
  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (data: Partial<OnboardingData>) => void;
  completeOnboarding: () => void;
  startReplay: () => void;
  resetOnboarding: () => void;
  resetAllData: () => Promise<void>;
}

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'info',
  'principles',
  'maestri',
  'ready',
];

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      onboardingCompletedAt: null,
      currentStep: 'welcome',
      isReplayMode: false,
      data: {
        name: '',
      },

      setStep: (step) => set({ currentStep: step }),

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
          data: { name: '' },
        }),

      resetAllData: async () => {
        // Clear all localStorage stores
        const storeKeys = [
          'convergio-settings',
          'convergio-progress',
          'convergio-conversations',
          'convergio-learnings',
          'convergio-html-snippets',
          'convergio-calendar',
          'convergio-onboarding',
          'convergio-accessibility',
          'convergio-notifications',
          'convergio-pomodoro',
        ];

        storeKeys.forEach((key) => {
          localStorage.removeItem(key);
        });

        // Clear IndexedDB (materials, flashcards, etc.)
        const databases = ['convergio-materials', 'convergio-flashcards'];
        for (const dbName of databases) {
          try {
            indexedDB.deleteDatabase(dbName);
          } catch {
            // Ignore errors
          }
        }

        // Reset this store to initial state
        set({
          hasCompletedOnboarding: false,
          onboardingCompletedAt: null,
          currentStep: 'welcome',
          isReplayMode: false,
          data: { name: '' },
        });

        // Reload the page to reinitialize everything
        window.location.href = '/welcome';
      },
    }),
    { name: 'convergio-onboarding' }
  )
);

/**
 * Get current step index (0-based)
 */
export function getStepIndex(step: OnboardingStep): number {
  return STEP_ORDER.indexOf(step);
}

/**
 * Get total number of steps
 */
export function getTotalSteps(): number {
  return STEP_ORDER.length;
}
