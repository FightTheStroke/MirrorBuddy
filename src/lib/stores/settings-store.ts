// ============================================================================
// SETTINGS STORE - User preferences and configuration
// ============================================================================

import { create } from 'zustand';
import { logger } from '@/lib/logger';
import type { Theme, AIProvider } from '@/types';
import { csrfFetch } from '@/lib/auth/csrf-client';
import {
  type TeachingStyle,
  type LearningDifference,
  type ExtendedStudentProfile,
  type ProviderPreference,
  type AppearanceSettings,
  type AdaptiveDifficultyMode,
} from './settings-types';

export type { TeachingStyle, LearningDifference, ExtendedStudentProfile, ProviderPreference, AdaptiveDifficultyMode };

// === STORE ===

interface SettingsState {
  theme: Theme;
  provider: AIProvider;
  model: string;
  budgetLimit: number;
  totalSpent: number;
  studentProfile: ExtendedStudentProfile;
  appearance: AppearanceSettings;
  preferredProvider: ProviderPreference;
  preferredMicrophoneId: string; // Empty string = system default
  preferredOutputId: string; // Empty string = system default (speakers)
  preferredCameraId: string; // Empty string = system default
  adaptiveDifficultyMode: AdaptiveDifficultyMode;
  // Voice settings (Azure Realtime API)
  voiceVadThreshold: number; // VAD sensitivity (0.3-0.7, default 0.4)
  voiceSilenceDuration: number; // Silence before turn ends (300-800ms, default 400)
  voiceBargeInEnabled: boolean; // Allow interrupting maestro (default true)
  // Sync state
  lastSyncedAt: Date | null;
  pendingSync: boolean;
  // Actions
  setTheme: (theme: Theme) => void;
  setProvider: (provider: AIProvider) => void;
  setModel: (model: string) => void;
  setBudgetLimit: (limit: number) => void;
  addCost: (cost: number) => void;
  updateStudentProfile: (profile: Partial<ExtendedStudentProfile>) => void;
  updateAppearance: (appearance: Partial<AppearanceSettings>) => void;
  setPreferredProvider: (provider: ProviderPreference) => void;
  setPreferredMicrophone: (microphoneId: string) => void;
  setPreferredOutput: (outputId: string) => void;
  setPreferredCamera: (cameraId: string) => void;
  setAdaptiveDifficultyMode: (mode: AdaptiveDifficultyMode) => void;
  // Voice settings actions
  setVoiceVadThreshold: (threshold: number) => void;
  setVoiceSilenceDuration: (duration: number) => void;
  setVoiceBargeInEnabled: (enabled: boolean) => void;
  // Sync actions
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  (set, get) => ({
      theme: 'system',
      provider: 'azure',  // #89: Changed from 'openai' - only azure/ollama supported
      model: 'gpt-4o',
      budgetLimit: 50,
      totalSpent: 0,
      studentProfile: {
        name: '',
        age: 14,
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
        set((state) => ({ totalSpent: state.totalSpent + cost, pendingSync: true })),
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
      setPreferredProvider: (preferredProvider) =>
        set({ preferredProvider, pendingSync: true }),
      setPreferredMicrophone: (preferredMicrophoneId) =>
        set({ preferredMicrophoneId, pendingSync: true }),
      setPreferredOutput: (preferredOutputId) =>
        set({ preferredOutputId, pendingSync: true }),
      setPreferredCamera: (preferredCameraId) =>
        set({ preferredCameraId, pendingSync: true }),
      setAdaptiveDifficultyMode: (adaptiveDifficultyMode) =>
        set({ adaptiveDifficultyMode, pendingSync: true }),
      // Voice settings setters with validation
      setVoiceVadThreshold: (threshold) =>
        set({ voiceVadThreshold: Math.max(0.3, Math.min(0.7, threshold)), pendingSync: true }),
      setVoiceSilenceDuration: (duration) =>
        set({ voiceSilenceDuration: Math.max(300, Math.min(800, duration)), pendingSync: true }),
      setVoiceBargeInEnabled: (enabled) =>
        set({ voiceBargeInEnabled: enabled, pendingSync: true }),

      syncToServer: async () => {
        const state = get();
        if (!state.pendingSync) return;

        try {
          // Sync settings - #88: Added totalSpent to persist budget tracking
          await csrfFetch('/api/user/settings', {
            method: 'PUT',
            body: JSON.stringify({
              theme: state.theme,
              provider: state.provider,
              model: state.model,
              budgetLimit: state.budgetLimit,
              totalSpent: state.totalSpent,  // #88: Now persisted
              adaptiveDifficultyMode: state.adaptiveDifficultyMode,
              language: state.appearance.language,
              accentColor: state.appearance.accentColor,
            }),
          });

          // Sync profile
          await csrfFetch('/api/user/profile', {
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
              accessibility: {
                fontSize: state.studentProfile.fontSize,
                highContrast: state.studentProfile.highContrast,
                dyslexiaFont: state.studentProfile.dyslexiaFont,
                voiceEnabled: state.studentProfile.voiceEnabled,
                simplifiedLanguage: state.studentProfile.simplifiedLanguage,
                adhdMode: state.studentProfile.adhdMode,
              },
            }),
          });

          set({ lastSyncedAt: new Date(), pendingSync: false });
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

          if (settingsRes.ok) {
            const settings = await settingsRes.json();
            set((state) => ({
              theme: settings.theme ?? state.theme,
              provider: settings.provider ?? state.provider,
              model: settings.model ?? state.model,
              budgetLimit: settings.budgetLimit ?? state.budgetLimit,
              totalSpent: settings.totalSpent ?? state.totalSpent,  // #88: Load from server
              adaptiveDifficultyMode: settings.adaptiveDifficultyMode ?? state.adaptiveDifficultyMode,
              appearance: {
                ...state.appearance,
                language: settings.language ?? state.appearance.language,
                accentColor: settings.accentColor ?? state.appearance.accentColor,
              },
            }));
          }

          if (profileRes.ok) {
            const profile = await profileRes.json();
            if (profile) {
              const accessibility = profile.accessibility || {};
              set((state) => ({
                studentProfile: {
                  ...state.studentProfile,
                  name: profile.name ?? state.studentProfile.name,
                  age: profile.age ?? state.studentProfile.age,
                  schoolYear: profile.schoolYear ?? state.studentProfile.schoolYear,
                  schoolLevel: profile.schoolLevel ?? state.studentProfile.schoolLevel,
                  gradeLevel: profile.gradeLevel ?? state.studentProfile.gradeLevel,
                  learningGoals: profile.learningGoals ?? state.studentProfile.learningGoals,
                  // Character preferences
                  preferredCoach: profile.preferredCoach ?? state.studentProfile.preferredCoach,
                  preferredBuddy: profile.preferredBuddy ?? state.studentProfile.preferredBuddy,
                  fontSize: accessibility.fontSize ?? state.studentProfile.fontSize,
                  highContrast: accessibility.highContrast ?? state.studentProfile.highContrast,
                  dyslexiaFont: accessibility.dyslexiaFont ?? state.studentProfile.dyslexiaFont,
                  voiceEnabled: accessibility.voiceEnabled ?? state.studentProfile.voiceEnabled,
                  simplifiedLanguage: accessibility.simplifiedLanguage ?? state.studentProfile.simplifiedLanguage,
                  adhdMode: accessibility.adhdMode ?? state.studentProfile.adhdMode,
                },
              }));
            }
          }

          set({ lastSyncedAt: new Date(), pendingSync: false });
        } catch (error) {
          logger.error('Settings load failed', { error: String(error) });
        }
      },
    })
);
