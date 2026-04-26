"use client";

import { create } from "zustand";
import type {
  AccessibilitySettings,
  ADHDSessionState,
  ADHDSessionConfig,
  ADHDSessionStats,
  AccessibilityContext,
} from "./accessibility-store/types";
import * as profiles from "./accessibility-store/profiles";
import * as adhdActions from "./accessibility-store/adhd-actions";
import * as helpers from "./accessibility-store/helpers";
import {
  defaultAccessibilitySettings,
  defaultADHDConfig,
  defaultADHDStats,
} from "./accessibility-store/defaults";
import {
  getA11yCookie,
  setA11yCookie,
  clearA11yCookie,
} from "./a11y-cookie-storage";
import {
  detectBrowserPreferences,
  browserPrefsToSettings,
} from "./browser-detection";
import { trackProfileActivation, trackReset } from "./a11y-telemetry";
import { csrfFetch } from "@/lib/auth";

export type {
  AccessibilitySettings,
  ADHDSessionState,
  ADHDSessionConfig,
  ADHDSessionStats,
  AccessibilityContext,
} from "./accessibility-store/types";

// Profile ID type for tracking active profile
export type A11yProfileId =
  | "dyslexia"
  | "adhd"
  | "visual"
  | "motor"
  | "autism"
  | "auditory"
  | "cerebral"
  | null;

// Store interface
interface AccessibilityStore {
  settings: AccessibilitySettings;
  parentSettings: AccessibilitySettings; // Separate settings for parent dashboard
  currentContext: AccessibilityContext;
  activeProfile: A11yProfileId; // Currently active profile preset
  adhdConfig: ADHDSessionConfig;
  adhdStats: ADHDSessionStats;
  adhdSessionState: ADHDSessionState;
  adhdTimeRemaining: number;
  adhdSessionProgress: number;
  isAuthenticated: boolean; // Track if user is logged in for DB sync

  // Context switching
  setContext: (context: AccessibilityContext) => void;
  getActiveSettings: () => AccessibilitySettings;

  // Cookie persistence
  loadFromCookie: () => void;
  saveToCookie: () => void;
  applyBrowserPreferences: () => void;

  // Database persistence (for authenticated users)
  setAuthenticated: (isAuth: boolean) => void;
  loadFromDatabase: () => Promise<void>;
  saveToDatabase: () => Promise<void>;

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
    currentContext: "student" as AccessibilityContext,
    activeProfile: null,
    adhdConfig: defaultADHDConfig,
    adhdStats: defaultADHDStats,
    adhdSessionState: "idle",
    adhdTimeRemaining: defaultADHDConfig.workDuration,
    adhdSessionProgress: 0,
    isAuthenticated: false,

    // Context switching
    setContext: (context) => set({ currentContext: context }),

    getActiveSettings: () => {
      const state = get();
      return state.currentContext === "parent"
        ? state.parentSettings
        : state.settings;
    },

    // Cookie persistence
    loadFromCookie: () => {
      const cookie = getA11yCookie();
      if (cookie) {
        set((state) => ({
          settings: { ...state.settings, ...cookie.overrides },
          activeProfile: cookie.activeProfile as A11yProfileId,
        }));
      }
    },

    saveToCookie: () => {
      const state = get();
      setA11yCookie({
        activeProfile: state.activeProfile,
        overrides: state.settings,
      });
    },

    applyBrowserPreferences: () => {
      const cookie = getA11yCookie();
      // Only apply if we haven't already applied browser preferences
      if (cookie?.browserDetectedApplied) return;

      const prefs = detectBrowserPreferences();
      const settings = browserPrefsToSettings(prefs);

      if (Object.keys(settings).length > 0) {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
        // Mark as applied so we don't override user changes
        setA11yCookie({ browserDetectedApplied: true });
      }
    },

    // Database persistence
    setAuthenticated: (isAuth) => set({ isAuthenticated: isAuth }),

    loadFromDatabase: async () => {
      try {
        const response = await fetch("/api/user/accessibility");
        if (response.ok) {
          const data = await response.json();
          // Map DB fields to store settings (exclude id, userId, timestamps)
          const {
            id: _id,
            userId: _userId,
            createdAt: _createdAt,
            updatedAt: _updatedAt,
            adhdConfig: dbAdhdConfig,
            adhdStats: dbAdhdStats,
            ...dbSettings
          } = data;

          set((state) => ({
            settings: { ...state.settings, ...dbSettings },
            isAuthenticated: true,
            adhdConfig: dbAdhdConfig
              ? { ...state.adhdConfig, ...JSON.parse(dbAdhdConfig) }
              : state.adhdConfig,
            adhdStats: dbAdhdStats
              ? { ...state.adhdStats, ...JSON.parse(dbAdhdStats) }
              : state.adhdStats,
          }));
        }
      } catch {
        // Silent fail - use cookie/defaults
      }
    },

    saveToDatabase: async () => {
      const state = get();
      if (!state.isAuthenticated) return;

      try {
        await csrfFetch("/api/user/accessibility", {
          method: "PUT",
          body: JSON.stringify({
            ...state.settings,
            adhdConfig: JSON.stringify(state.adhdConfig),
            adhdStats: JSON.stringify(state.adhdStats),
          }),
        });
      } catch {
        // Silent fail - cookie is backup
      }
    },

    // Settings actions
    updateSettings: (updates) => {
      set((state) => ({
        settings: { ...state.settings, ...updates },
        activeProfile: null, // Clear profile when manually changing settings
      }));
      // Auto-save to cookie (always) and database (if authenticated)
      setTimeout(() => {
        get().saveToCookie();
        get().saveToDatabase();
      }, 0);
    },

    updateParentSettings: (updates) =>
      set((state) => ({
        parentSettings: { ...state.parentSettings, ...updates },
      })),

    resetSettings: () => {
      set({
        settings: defaultAccessibilitySettings,
        activeProfile: null,
      });
      clearA11yCookie();
      // Reset in database too
      setTimeout(() => get().saveToDatabase(), 0);
      trackReset();
    },

    resetParentSettings: () =>
      set({
        parentSettings: defaultAccessibilitySettings,
      }),

    // Profile presets (delegated to profiles module)
    applyDyslexiaProfile: () => {
      set((state) => ({
        settings: profiles.applyDyslexiaProfile(state.settings),
        activeProfile: "dyslexia",
      }));
      setTimeout(() => {
        get().saveToCookie();
        get().saveToDatabase();
      }, 0);
      trackProfileActivation("dyslexia");
    },

    applyADHDProfile: () => {
      set((state) => ({
        settings: profiles.applyADHDProfile(state.settings),
        activeProfile: "adhd",
      }));
      setTimeout(() => {
        get().saveToCookie();
        get().saveToDatabase();
      }, 0);
      trackProfileActivation("adhd");
    },

    applyVisualImpairmentProfile: () => {
      set((state) => ({
        settings: profiles.applyVisualImpairmentProfile(state.settings),
        activeProfile: "visual",
      }));
      setTimeout(() => {
        get().saveToCookie();
        get().saveToDatabase();
      }, 0);
      trackProfileActivation("visual");
    },

    applyMotorImpairmentProfile: () => {
      set((state) => ({
        settings: profiles.applyMotorImpairmentProfile(state.settings),
        activeProfile: "motor",
      }));
      setTimeout(() => {
        get().saveToCookie();
        get().saveToDatabase();
      }, 0);
      trackProfileActivation("motor");
    },

    applyAutismProfile: () => {
      set((state) => ({
        settings: profiles.applyAutismProfile(state.settings),
        activeProfile: "autism",
      }));
      setTimeout(() => {
        get().saveToCookie();
        get().saveToDatabase();
      }, 0);
      trackProfileActivation("autism");
    },

    applyAuditoryImpairmentProfile: () => {
      set((state) => ({
        settings: profiles.applyAuditoryImpairmentProfile(state.settings),
        activeProfile: "auditory",
      }));
      setTimeout(() => {
        get().saveToCookie();
        get().saveToDatabase();
      }, 0);
      trackProfileActivation("auditory");
    },

    applyCerebralPalsyProfile: () => {
      set((state) => ({
        settings: profiles.applyCerebralPalsyProfile(state.settings),
        activeProfile: "cerebral",
      }));
      setTimeout(() => {
        get().saveToCookie();
        get().saveToDatabase();
      }, 0);
      trackProfileActivation("cerebral");
    },

    // ADHD actions (delegated to adhdActions module)
    updateADHDConfig: (updates) =>
      set((state) => ({
        adhdConfig: { ...state.adhdConfig, ...updates },
      })),

    startADHDSession: () => set((state) => adhdActions.startADHDSession(state)),

    pauseADHDSession: () => {
      // Timer pause handled externally
    },

    resumeADHDSession: () => {
      // Timer resume handled externally
    },

    stopADHDSession: () => set((state) => adhdActions.stopADHDSession(state)),

    completeADHDSession: () => {
      const state = get();
      set(adhdActions.completeADHDSession(state));
    },

    startADHDBreak: (isLongBreak = false) =>
      set((state) => adhdActions.startADHDBreak(state, isLongBreak)),

    tickADHDTimer: () => set((state) => adhdActions.tickADHDTimer(state)),

    resetADHDStats: () =>
      set({
        adhdStats: defaultADHDStats,
      }),

    // Helpers (delegated to helpers module)
    getLineSpacing: () => helpers.getLineSpacing(get().settings),

    getFontSizeMultiplier: () => helpers.getFontSizeMultiplier(get().settings),

    getLetterSpacing: () => helpers.getLetterSpacing(get().settings),

    shouldAnimate: () => helpers.shouldAnimate(get().settings),

    getAnimationDuration: (baseDuration = 0.3) =>
      helpers.getAnimationDuration(get().settings, baseDuration),

    getFormattedTimeRemaining: () =>
      adhdActions.formatTimeRemaining(get().adhdTimeRemaining),

    getCompletionRate: () => adhdActions.getCompletionRate(get().adhdStats),
  }),
);

// Export default settings for SSR
export { defaultAccessibilitySettings, defaultADHDConfig, defaultADHDStats };
