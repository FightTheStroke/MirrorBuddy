'use client';

import { create } from 'zustand';
import type {
  AccessibilitySettings,
  ADHDSessionState,
  ADHDSessionConfig,
  ADHDSessionStats,
  AccessibilityContext,
} from './accessibility-store/types';
import * as profiles from './accessibility-store/profiles';
import * as adhdActions from './accessibility-store/adhd-actions';
import * as helpers from './accessibility-store/helpers';

export type {
  AccessibilitySettings,
  ADHDSessionState,
  ADHDSessionConfig,
  ADHDSessionStats,
  AccessibilityContext,
} from './accessibility-store/types';

// Default settings
const defaultAccessibilitySettings: AccessibilitySettings = {
  dyslexiaFont: false,
  extraLetterSpacing: false,
  increasedLineHeight: false,
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  ttsEnabled: false,
  ttsSpeed: 1.0,
  ttsAutoRead: false,
  adhdMode: false,
  distractionFreeMode: false,
  breakReminders: false,
  lineSpacing: 1.0,
  fontSize: 1.0,
  colorBlindMode: false,
  keyboardNavigation: true,
  customBackgroundColor: '#ffffff',
  customTextColor: '#000000',
};

const defaultADHDConfig: ADHDSessionConfig = {
  workDuration: 15 * 60, // 15 minutes
  breakDuration: 5 * 60, // 5 minutes
  longBreakDuration: 15 * 60, // 15 minutes
  sessionsUntilLongBreak: 4,
  enableSoundAlerts: true,
  enableNotifications: true,
  enableGamification: true,
  xpPerSession: 50,
};

const defaultADHDStats: ADHDSessionStats = {
  totalSessions: 0,
  completedSessions: 0,
  totalWorkTime: 0,
  totalBreakTime: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalXPEarned: 0,
  lastSessionAt: null,
  lastSessionDate: null,
};


// Store interface
interface AccessibilityStore {
  settings: AccessibilitySettings;
  parentSettings: AccessibilitySettings; // Separate settings for parent dashboard
  currentContext: AccessibilityContext;
  adhdConfig: ADHDSessionConfig;
  adhdStats: ADHDSessionStats;
  adhdSessionState: ADHDSessionState;
  adhdTimeRemaining: number;
  adhdSessionProgress: number;

  // Context switching
  setContext: (context: AccessibilityContext) => void;
  getActiveSettings: () => AccessibilitySettings;

  // Settings actions
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  updateParentSettings: (updates: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  resetParentSettings: () => void;

  // Profile presets
  applyDyslexiaProfile: () => void;
  applyADHDProfile: () => void;
  applyVisualImpairmentProfile: () => void;
  applyMotorImpairmentProfile: () => void;
  applyAutismProfile: () => void;
  applyAuditoryImpairmentProfile: () => void;
  applyCerebralPalsyProfile: () => void;

  // ADHD actions
  updateADHDConfig: (updates: Partial<ADHDSessionConfig>) => void;
  startADHDSession: () => void;
  pauseADHDSession: () => void;
  resumeADHDSession: () => void;
  stopADHDSession: () => void;
  completeADHDSession: () => void;
  startADHDBreak: (isLongBreak?: boolean) => void;
  tickADHDTimer: () => void;
  resetADHDStats: () => void;

  // Helpers
  getLineSpacing: () => number;
  getFontSizeMultiplier: () => number;
  getLetterSpacing: () => number;
  shouldAnimate: () => boolean;
  getAnimationDuration: (baseDuration?: number) => number;
  getFormattedTimeRemaining: () => string;
  getCompletionRate: () => number;
}

export const useAccessibilityStore = create<AccessibilityStore>()(
  (set, get) => ({
      settings: defaultAccessibilitySettings,
      parentSettings: defaultAccessibilitySettings,
      currentContext: 'student' as AccessibilityContext,
      adhdConfig: defaultADHDConfig,
      adhdStats: defaultADHDStats,
      adhdSessionState: 'idle',
      adhdTimeRemaining: defaultADHDConfig.workDuration,
      adhdSessionProgress: 0,

      // Context switching
      setContext: (context) => set({ currentContext: context }),

      getActiveSettings: () => {
        const state = get();
        return state.currentContext === 'parent' ? state.parentSettings : state.settings;
      },

      // Settings actions
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      updateParentSettings: (updates) =>
        set((state) => ({
          parentSettings: { ...state.parentSettings, ...updates },
        })),

      resetSettings: () =>
        set({
          settings: defaultAccessibilitySettings,
        }),

      resetParentSettings: () =>
        set({
          parentSettings: defaultAccessibilitySettings,
        }),

      // Profile presets (delegated to profiles module)
      applyDyslexiaProfile: () =>
        set((state) => ({
          settings: profiles.applyDyslexiaProfile(state.settings),
        })),

      applyADHDProfile: () =>
        set((state) => ({
          settings: profiles.applyADHDProfile(state.settings),
        })),

      applyVisualImpairmentProfile: () =>
        set((state) => ({
          settings: profiles.applyVisualImpairmentProfile(state.settings),
        })),

      applyMotorImpairmentProfile: () =>
        set((state) => ({
          settings: profiles.applyMotorImpairmentProfile(state.settings),
        })),

      applyAutismProfile: () =>
        set((state) => ({
          settings: profiles.applyAutismProfile(state.settings),
        })),

      applyAuditoryImpairmentProfile: () =>
        set((state) => ({
          settings: profiles.applyAuditoryImpairmentProfile(state.settings),
        })),

      applyCerebralPalsyProfile: () =>
        set((state) => ({
          settings: profiles.applyCerebralPalsyProfile(state.settings),
        })),

      // ADHD actions (delegated to adhdActions module)
      updateADHDConfig: (updates) =>
        set((state) => ({
          adhdConfig: { ...state.adhdConfig, ...updates },
        })),

      startADHDSession: () =>
        set((state) => adhdActions.startADHDSession(state)),

      pauseADHDSession: () => {
        // Timer pause handled externally
      },

      resumeADHDSession: () => {
        // Timer resume handled externally
      },

      stopADHDSession: () =>
        set((state) => adhdActions.stopADHDSession(state)),

      completeADHDSession: () => {
        const state = get();
        set(adhdActions.completeADHDSession(state));
      },

      startADHDBreak: (isLongBreak = false) =>
        set((state) => adhdActions.startADHDBreak(state, isLongBreak)),

      tickADHDTimer: () =>
        set((state) => adhdActions.tickADHDTimer(state)),

      resetADHDStats: () =>
        set({
          adhdStats: defaultADHDStats,
        }),

      // Helpers (delegated to helpers module)
      getLineSpacing: () => helpers.getLineSpacing(get().settings),

      getFontSizeMultiplier: () => helpers.getFontSizeMultiplier(get().settings),

      getLetterSpacing: () => helpers.getLetterSpacing(get().settings),

      shouldAnimate: () => helpers.shouldAnimate(get().settings),

      getAnimationDuration: (baseDuration = 0.3) => helpers.getAnimationDuration(get().settings, baseDuration),

      getFormattedTimeRemaining: () => adhdActions.formatTimeRemaining(get().adhdTimeRemaining),

      getCompletionRate: () => adhdActions.getCompletionRate(get().adhdStats),
    })
);

// Export default settings for SSR
export { defaultAccessibilitySettings, defaultADHDConfig, defaultADHDStats };
