// ============================================================================
// SETTINGS STORE - User preferences and configuration
// ============================================================================

import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { isUndeliveredRequest } from './undelivered-request';
import { csrfFetch } from '@/lib/auth';
import type { SettingsState } from './settings-types';

export type {
  TeachingStyle,
  LearningDifference,
  ExtendedStudentProfile,
  ProviderPreference,
  AdaptiveDifficultyMode,
} from './settings-types';

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  theme: 'system',
  provider: 'azure', // #89: Changed from 'openai' - only azure/ollama supported
  model: 'gpt-5-mini',
  budgetLimit: 50,
  totalSpent: 0,
  studentProfile: {
    name: '',
    age: undefined,
    schoolYear: 1,
    schoolLevel: 'superiore',
    gradeLevel: '',
    learningGoals: [],
    teachingStyle: 'balanced',
    fontSize: 'medium',
    highContrast: false,
    dyslexiaFont: false,
    voiceEnabled: true,
    simplifiedLanguage: false,
    adhdMode: false,
    // MirrorBuddy defaults
    learningDifferences: [],
    preferredCoach: undefined,
    preferredBuddy: undefined,
    crossMaestroEnabled: true, // Enabled by default
  },
  appearance: {
    theme: 'system',
    accentColor: 'blue',
    language: 'it',
  },
  preferredProvider: 'auto',
  preferredMicrophoneId: '', // Empty = system default
  preferredOutputId: '', // Empty = system default (speakers)
  preferredCameraId: '', // Empty = system default
  adaptiveDifficultyMode: 'balanced',
  // Voice settings defaults
  voiceVadThreshold: 0.4, // Balanced sensitivity
  voiceSilenceDuration: 400, // Fast turn-taking
  voiceBargeInEnabled: true, // Allow interrupting maestro
  lastSyncedAt: null,
  pendingSync: false,

  setTheme: (theme) => set({ theme, pendingSync: true }),
  setProvider: (provider) => set({ provider, pendingSync: true }),
  setModel: (model) => set({ model, pendingSync: true }),
  setBudgetLimit: (budgetLimit) => set({ budgetLimit, pendingSync: true }),
  addCost: (cost) =>
    set((state) => ({
      totalSpent: state.totalSpent + cost,
      pendingSync: true,
    })),
  updateStudentProfile: (profile) =>
    set((state) => ({
      studentProfile: { ...state.studentProfile, ...profile },
      pendingSync: true,
    })),
  updateAppearance: (appearance) =>
    set((state) => ({
      appearance: { ...state.appearance, ...appearance },
      pendingSync: true,
    })),
  setPreferredProvider: (preferredProvider) => set({ preferredProvider, pendingSync: true }),
  setPreferredMicrophone: (preferredMicrophoneId) =>
    set({ preferredMicrophoneId, pendingSync: true }),
  setPreferredOutput: (preferredOutputId) => set({ preferredOutputId, pendingSync: true }),
  setPreferredCamera: (preferredCameraId) => set({ preferredCameraId, pendingSync: true }),
  setAdaptiveDifficultyMode: (adaptiveDifficultyMode) =>
    set({ adaptiveDifficultyMode, pendingSync: true }),
  // Voice settings setters with validation
  setVoiceVadThreshold: (threshold) =>
    set({
      voiceVadThreshold: Math.max(0.3, Math.min(0.7, threshold)),
      pendingSync: true,
    }),
  setVoiceSilenceDuration: (duration) =>
    set({
      voiceSilenceDuration: Math.max(300, Math.min(800, duration)),
      pendingSync: true,
    }),
  setVoiceBargeInEnabled: (enabled) => set({ voiceBargeInEnabled: enabled, pendingSync: true }),

  syncToServer: async () => {
    const state = get();
    if (!state.pendingSync) return;

    try {
      // Sync settings - #88: Added totalSpent to persist budget tracking
      const settingsResponse = await csrfFetch('/api/user/settings', {
        method: 'PUT',
        body: JSON.stringify({
          theme: state.theme,
          provider: state.provider,
          model: state.model,
          budgetLimit: state.budgetLimit,
          totalSpent: state.totalSpent, // #88: Now persisted
          adaptiveDifficultyMode: state.adaptiveDifficultyMode,
          language: state.appearance.language,
          accentColor: state.appearance.accentColor,
          fontSize: state.studentProfile.fontSize,
          highContrast: state.studentProfile.highContrast,
          dyslexiaFont: state.studentProfile.dyslexiaFont,
          voiceEnabled: state.studentProfile.voiceEnabled,
          simplifiedLanguage: state.studentProfile.simplifiedLanguage,
          adhdMode: state.studentProfile.adhdMode,
        }),
      });
      if (!settingsResponse.ok) {
        throw new Error(`Settings save failed (${settingsResponse.status})`);
      }

      // Sync profile
      const profileResponse = await csrfFetch('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: state.studentProfile.name,
          age: state.studentProfile.age,
          schoolYear: state.studentProfile.schoolYear,
          schoolLevel: state.studentProfile.schoolLevel,
          gradeLevel: state.studentProfile.gradeLevel,
          learningGoals: state.studentProfile.learningGoals,
          // Character preferences
          preferredCoach: state.studentProfile.preferredCoach,
          preferredBuddy: state.studentProfile.preferredBuddy,
        }),
      });
      if (!profileResponse.ok) {
        throw new Error(`Profile save failed (${profileResponse.status})`);
      }

      set({ lastSyncedAt: new Date(), pendingSync: get() !== state });
    } catch (error) {
      logger.error('Settings sync failed', { error: String(error) });
    }
  },

  loadFromServer: async () => {
    try {
      const [settingsRes, profileRes] = await Promise.all([
        fetch('/api/user/settings'),
        fetch('/api/user/profile'),
      ]);

      // No user cookie yet (pre-onboarding), not an error
      if (settingsRes.status === 401 || profileRes.status === 401) {
        return;
      }
      if (!settingsRes.ok || !profileRes.ok) {
        throw new Error(`Settings load failed (${settingsRes.status}, ${profileRes.status})`);
      }

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        set((state) => ({
          theme: settings.theme ?? state.theme,
          provider: settings.provider ?? state.provider,
          model: settings.model ?? state.model,
          budgetLimit: settings.budgetLimit ?? state.budgetLimit,
          totalSpent: settings.totalSpent ?? state.totalSpent, // #88: Load from server
          adaptiveDifficultyMode: settings.adaptiveDifficultyMode ?? state.adaptiveDifficultyMode,
          appearance: {
            ...state.appearance,
            language: settings.language ?? state.appearance.language,
            accentColor: settings.accentColor ?? state.appearance.accentColor,
          },
          studentProfile: {
            ...state.studentProfile,
            fontSize: settings.fontSize ?? state.studentProfile.fontSize,
            highContrast: settings.highContrast ?? state.studentProfile.highContrast,
            dyslexiaFont: settings.dyslexiaFont ?? state.studentProfile.dyslexiaFont,
            voiceEnabled: settings.voiceEnabled ?? state.studentProfile.voiceEnabled,
            simplifiedLanguage:
              settings.simplifiedLanguage ?? state.studentProfile.simplifiedLanguage,
            adhdMode: settings.adhdMode ?? state.studentProfile.adhdMode,
          },
        }));
      }

      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile) {
          // Never surface the PII decryption placeholder to the student. If the
          // server failed to decrypt the name (e.g. key rotation/mismatch), the
          // middleware returns the literal '[decryption-failed]'; treat it as no
          // name so the UI falls back to a generic greeting instead of showing
          // "Ciao [decryption-failed]!" to a child.
          const safeName =
            profile.name && profile.name !== '[decryption-failed]' ? profile.name : undefined;
          set((state) => ({
            studentProfile: {
              ...state.studentProfile,
              name: safeName ?? state.studentProfile.name,
              age: profile.age ?? undefined,
              schoolYear: profile.schoolYear ?? state.studentProfile.schoolYear,
              schoolLevel: profile.schoolLevel ?? state.studentProfile.schoolLevel,
              gradeLevel: profile.gradeLevel ?? state.studentProfile.gradeLevel,
              learningGoals: profile.learningGoals ?? state.studentProfile.learningGoals,
              // Character preferences
              preferredCoach: profile.preferredCoach ?? state.studentProfile.preferredCoach,
              preferredBuddy: profile.preferredBuddy ?? state.studentProfile.preferredBuddy,
            },
          }));
        }
      }

      set({ lastSyncedAt: new Date(), pendingSync: false });
    } catch (error) {
      if (isUndeliveredRequest(error)) return;
      logger.error('Settings load failed', { error: String(error) });
    }
  },
}));
