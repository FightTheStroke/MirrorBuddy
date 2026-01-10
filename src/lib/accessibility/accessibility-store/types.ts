/**
 * Types for Accessibility Store
 */

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
  totalWorkTime: number; // seconds
  totalBreakTime: number;
  currentStreak: number;
  longestStreak: number;
  lastSessionAt: Date | null;
}

// Accessibility context
export type AccessibilityContext = 'student' | 'parent';
