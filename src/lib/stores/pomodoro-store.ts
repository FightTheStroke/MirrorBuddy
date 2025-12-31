'use client';

import { create } from 'zustand';

export type PomodoroPhase = 'idle' | 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  pomodorosUntilLongBreak: number;
}

export interface PomodoroState {
  // Timer state
  phase: PomodoroPhase;
  timeRemaining: number;
  isRunning: boolean;
  completedPomodoros: number;
  totalFocusTime: number;

  // Settings
  settings: PomodoroSettings;

  // Session tracking
  todayPomodoros: number;
  todayFocusMinutes: number;
  lastActiveDate: string;
}

interface PomodoroStore extends PomodoroState {
  // Actions
  setPhase: (phase: PomodoroPhase) => void;
  setTimeRemaining: (time: number) => void;
  setIsRunning: (running: boolean) => void;
  incrementPomodoros: () => void;
  addFocusTime: (minutes: number) => void;
  updateSettings: (settings: Partial<PomodoroSettings>) => void;
  reset: () => void;
  resetDaily: () => void;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  pomodorosUntilLongBreak: 4,
};

const getToday = () => new Date().toISOString().split('T')[0];

export const usePomodoroStore = create<PomodoroStore>()(
  (set, get) => ({
      // Initial state
      phase: 'idle',
      timeRemaining: DEFAULT_SETTINGS.focusMinutes * 60,
      isRunning: false,
      completedPomodoros: 0,
      totalFocusTime: 0,
      settings: DEFAULT_SETTINGS,
      todayPomodoros: 0,
      todayFocusMinutes: 0,
      lastActiveDate: getToday(),

      setPhase: (phase) => set({ phase }),
      setTimeRemaining: (time) => set({ timeRemaining: time }),
      setIsRunning: (running) => set({ isRunning: running }),

      incrementPomodoros: () => {
        const today = getToday();
        const state = get();

        // Reset daily stats if new day
        if (state.lastActiveDate !== today) {
          set({
            todayPomodoros: 1,
            todayFocusMinutes: state.settings.focusMinutes,
            lastActiveDate: today,
            completedPomodoros: state.completedPomodoros + 1,
            totalFocusTime: state.totalFocusTime + state.settings.focusMinutes * 60,
          });
        } else {
          set({
            completedPomodoros: state.completedPomodoros + 1,
            todayPomodoros: state.todayPomodoros + 1,
            todayFocusMinutes: state.todayFocusMinutes + state.settings.focusMinutes,
            totalFocusTime: state.totalFocusTime + state.settings.focusMinutes * 60,
          });
        }
      },

      addFocusTime: (minutes) =>
        set((state) => ({
          totalFocusTime: state.totalFocusTime + minutes * 60,
          todayFocusMinutes: state.todayFocusMinutes + minutes,
        })),

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      reset: () =>
        set((state) => ({
          phase: 'idle',
          timeRemaining: state.settings.focusMinutes * 60,
          isRunning: false,
          completedPomodoros: 0,
          totalFocusTime: 0,
        })),

      resetDaily: () => {
        const today = getToday();
        set({
          todayPomodoros: 0,
          todayFocusMinutes: 0,
          lastActiveDate: today,
        });
      },
    })
);
