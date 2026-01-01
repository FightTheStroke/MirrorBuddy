/**
 * Onboarding Store
 *
 * Manages the onboarding flow state:
 * - Track if user has completed onboarding
 * - Current step in the flow
 * - Collected data during onboarding
 */

import { create } from 'zustand';

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

interface VoiceTranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface OnboardingState {
  // Flow state
  hasCompletedOnboarding: boolean;
  onboardingCompletedAt: string | null;
  currentStep: OnboardingStep;
  isReplayMode: boolean;
  isVoiceMuted: boolean;
  isHydrated: boolean; // True after we've checked the DB

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

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'info',
  'principles',
  'maestri',
  'ready',
];

export const useOnboardingStore = create<OnboardingState>()(
  (set, get) => ({
      hasCompletedOnboarding: false,
      onboardingCompletedAt: null,
      currentStep: 'welcome',
      isReplayMode: false,
      isVoiceMuted: false,
      isHydrated: false,

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

      setVoiceSessionConnecting: (connecting) =>
        set({ voiceSessionConnecting: connecting }),

      addVoiceTranscript: (role, text) =>
        set((state) => ({
          voiceTranscript: [
            ...state.voiceTranscript,
            { role, text, timestamp: Date.now() },
          ],
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
        try {
          await fetch('/api/user/data', { method: 'DELETE' });
        } catch {
          // Continue with local cleanup even if API fails
        }

        // Clear any remaining localStorage (legacy/session data)
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
          'convergio-user-id',
        ];

        storeKeys.forEach((key) => {
          localStorage.removeItem(key);
        });

        // Clear sessionStorage (temporary user ID)
        sessionStorage.removeItem('convergio-user-id');

        // Clear IndexedDB (legacy materials storage)
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
          isVoiceMuted: false,
          isHydrated: false,
          voiceSessionActive: false,
          voiceSessionConnecting: false,
          voiceTranscript: [],
          azureAvailable: null,
          data: { name: '' },
        });

        // Reload the page to reinitialize everything
        window.location.href = '/welcome';
      },

      hydrateFromApi: async () => {
        // Skip if already hydrated
        if (get().isHydrated) return;

        try {
          const response = await fetch('/api/onboarding');
          if (!response.ok) {
            // API error - mark as hydrated but don't update state
            set({ isHydrated: true });
            return;
          }

          const data = await response.json();

          // If user has existing data (profile with name), consider them as onboarded
          // This handles the case where OnboardingState record is missing but user exists
          const isCompleted = data.onboardingState?.hasCompletedOnboarding ?? data.hasExistingData ?? false;

          // Update store with DB state
          set({
            isHydrated: true,
            hasCompletedOnboarding: isCompleted,
            onboardingCompletedAt: data.onboardingState?.onboardingCompletedAt ?? null,
            currentStep: (data.onboardingState?.currentStep as OnboardingStep) ?? (isCompleted ? 'ready' : 'welcome'),
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
        } catch {
          // Network error - mark as hydrated to avoid infinite loop
          set({ isHydrated: true });
        }
      },
    })
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
