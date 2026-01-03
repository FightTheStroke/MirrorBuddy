'use client';

import { create } from 'zustand';

// Accessibility settings interface
export interface AccessibilitySettings {
  // Dyslexia support
  dyslexiaFont: boolean;
  extraLetterSpacing: boolean;
  increasedLineHeight: boolean;

  // Visual support
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;

  // Text-to-Speech
  ttsEnabled: boolean;
  ttsSpeed: number; // 0.5 to 2.0
  ttsAutoRead: boolean;

  // ADHD support
  adhdMode: boolean;
  distractionFreeMode: boolean;
  breakReminders: boolean;

  // General accessibility
  lineSpacing: number; // 1.0 to 2.0
  fontSize: number; // 0.8 to 1.5
  colorBlindMode: boolean;
  keyboardNavigation: boolean;

  // Custom colors
  customBackgroundColor: string;
  customTextColor: string;
}

// ADHD session state
export type ADHDSessionState = 'idle' | 'working' | 'breakTime' | 'completed';

// ADHD session configuration
export interface ADHDSessionConfig {
  workDuration: number; // seconds
  breakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  enableSoundAlerts: boolean;
  enableNotifications: boolean;
  enableGamification: boolean;
  xpPerSession: number;
}

// ADHD session statistics
export interface ADHDSessionStats {
  totalSessions: number;
  completedSessions: number;
  totalWorkTime: number;
  totalBreakTime: number;
  currentStreak: number;
  longestStreak: number;
  totalXPEarned: number;
  lastSessionDate: string | null;
}

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
  lastSessionDate: null,
};

// User context type
export type AccessibilityContext = 'student' | 'parent';

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

      // Profile presets
      applyDyslexiaProfile: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            dyslexiaFont: true,
            extraLetterSpacing: true,
            increasedLineHeight: true,
            lineSpacing: 1.5,
            fontSize: 1.1,
          },
        })),

      applyADHDProfile: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            adhdMode: true,
            distractionFreeMode: true,
            breakReminders: true,
            reducedMotion: true,
          },
        })),

      applyVisualImpairmentProfile: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            highContrast: true,
            largeText: true,
            fontSize: 1.3,
            ttsEnabled: true,
          },
        })),

      applyMotorImpairmentProfile: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            keyboardNavigation: true,
            reducedMotion: true,
          },
        })),

      applyAutismProfile: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            reducedMotion: true,
            distractionFreeMode: true,
            highContrast: false, // Avoid sensory overload from harsh contrast
            lineSpacing: 1.4,
            fontSize: 1.1,
          },
        })),

      applyAuditoryImpairmentProfile: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            ttsEnabled: false, // TTS not useful for hearing impairment
            largeText: true, // Emphasize visual communication
            lineSpacing: 1.3,
            // Visual cues become primary - no audio-dependent features
          },
        })),

      applyCerebralPalsyProfile: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            keyboardNavigation: true, // Essential for motor control challenges
            reducedMotion: true, // Reduce visual fatigue
            ttsEnabled: true, // Assist with reading if eye tracking is difficult
            largeText: true, // Easier visual targeting
            fontSize: 1.2,
            lineSpacing: 1.4,
            extraLetterSpacing: true, // Compensate for visual tracking difficulties
          },
        })),

      // ADHD actions
      updateADHDConfig: (updates) =>
        set((state) => ({
          adhdConfig: { ...state.adhdConfig, ...updates },
        })),

      startADHDSession: () =>
        set((state) => ({
          adhdSessionState: 'working',
          adhdTimeRemaining: state.adhdConfig.workDuration,
          adhdSessionProgress: 0,
          adhdStats: {
            ...state.adhdStats,
            totalSessions: state.adhdStats.totalSessions + 1,
          },
        })),

      pauseADHDSession: () => {
        // Timer pause handled externally
      },

      resumeADHDSession: () => {
        // Timer resume handled externally
      },

      stopADHDSession: () =>
        set((state) => ({
          adhdSessionState: 'idle',
          adhdTimeRemaining: state.adhdConfig.workDuration,
          adhdSessionProgress: 0,
        })),

      completeADHDSession: () => {
        const state = get();
        const today = new Date().toDateString();
        const lastSessionDay = state.adhdStats.lastSessionDate
          ? new Date(state.adhdStats.lastSessionDate).toDateString()
          : null;

        let newStreak = state.adhdStats.currentStreak;
        if (lastSessionDay === today) {
          // Same day, streak continues
        } else if (
          lastSessionDay &&
          new Date(today).getTime() - new Date(lastSessionDay).getTime() <=
            24 * 60 * 60 * 1000
        ) {
          // Consecutive day
          newStreak += 1;
        } else {
          // Streak broken
          newStreak = 1;
        }

        set({
          adhdSessionState: 'completed',
          adhdStats: {
            ...state.adhdStats,
            completedSessions: state.adhdStats.completedSessions + 1,
            totalWorkTime:
              state.adhdStats.totalWorkTime + state.adhdConfig.workDuration,
            currentStreak: newStreak,
            longestStreak: Math.max(state.adhdStats.longestStreak, newStreak),
            totalXPEarned: state.adhdConfig.enableGamification
              ? state.adhdStats.totalXPEarned + state.adhdConfig.xpPerSession
              : state.adhdStats.totalXPEarned,
            lastSessionDate: new Date().toISOString(),
          },
        });
      },

      startADHDBreak: (isLongBreak = false) =>
        set((state) => ({
          adhdSessionState: 'breakTime',
          adhdTimeRemaining: isLongBreak
            ? state.adhdConfig.longBreakDuration
            : state.adhdConfig.breakDuration,
          adhdSessionProgress: 0,
        })),

      tickADHDTimer: () =>
        set((state) => {
          const newTime = Math.max(0, state.adhdTimeRemaining - 1);
          const totalDuration =
            state.adhdSessionState === 'working'
              ? state.adhdConfig.workDuration
              : state.adhdStats.completedSessions %
                  state.adhdConfig.sessionsUntilLongBreak ===
                0
              ? state.adhdConfig.longBreakDuration
              : state.adhdConfig.breakDuration;

          return {
            adhdTimeRemaining: newTime,
            adhdSessionProgress: 1 - newTime / totalDuration,
          };
        }),

      resetADHDStats: () =>
        set({
          adhdStats: defaultADHDStats,
        }),

      // Helpers
      getLineSpacing: () => {
        const { settings } = get();
        let spacing = settings.lineSpacing;
        if (settings.dyslexiaFont && settings.increasedLineHeight) {
          spacing = Math.max(spacing, 1.5);
        }
        return spacing;
      },

      getFontSizeMultiplier: () => {
        const { settings } = get();
        let multiplier = settings.fontSize;
        if (settings.largeText) {
          multiplier *= 1.2;
        }
        return multiplier;
      },

      getLetterSpacing: () => {
        const { settings } = get();
        if (settings.dyslexiaFont && settings.extraLetterSpacing) {
          return 0.05;
        }
        return 0;
      },

      shouldAnimate: () => {
        const { settings } = get();
        return !settings.reducedMotion;
      },

      getAnimationDuration: (baseDuration = 0.3) => {
        const { settings } = get();
        return settings.reducedMotion ? 0 : baseDuration;
      },

      getFormattedTimeRemaining: () => {
        const { adhdTimeRemaining } = get();
        const minutes = Math.floor(adhdTimeRemaining / 60);
        const seconds = Math.floor(adhdTimeRemaining % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      },

      getCompletionRate: () => {
        const { adhdStats } = get();
        if (adhdStats.totalSessions === 0) return 0;
        return adhdStats.completedSessions / adhdStats.totalSessions;
      },
    })
);

// Export default settings for SSR
export { defaultAccessibilitySettings, defaultADHDConfig, defaultADHDStats };
