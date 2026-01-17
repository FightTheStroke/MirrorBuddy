/**
 * Default values for Accessibility Store
 * Extracted for maintainability and to keep main store file compact
 */

import type {
  AccessibilitySettings,
  ADHDSessionConfig,
  ADHDSessionStats,
} from './types';

export const defaultAccessibilitySettings: AccessibilitySettings = {
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

export const defaultADHDConfig: ADHDSessionConfig = {
  workDuration: 15 * 60, // 15 minutes
  breakDuration: 5 * 60, // 5 minutes
  longBreakDuration: 15 * 60, // 15 minutes
  sessionsUntilLongBreak: 4,
  enableSoundAlerts: true,
  enableNotifications: true,
  enableGamification: true,
  xpPerSession: 50,
};

export const defaultADHDStats: ADHDSessionStats = {
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
