'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { formatTime } from '@/lib/hooks/pomodoro-helpers';
import {
  requestNotificationPermission,
  showNotification,
} from './pomodoro-notification';

export type PomodoroPhase = 'idle' | 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  pomodorosUntilLongBreak: number;
}

export interface PomodoroState {
  phase: PomodoroPhase;
  timeRemaining: number; // seconds
  completedPomodoros: number;
  isRunning: boolean;
  totalFocusTime: number; // seconds accumulated
}

export interface PomodoroActions {
  start: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  reset: () => void;
}

export interface UsePomodoroTimerReturn extends PomodoroState, PomodoroActions {
  settings: PomodoroSettings;
  updateSettings: (settings: Partial<PomodoroSettings>) => void;
  formattedTime: string;
  progress: number; // 0-100
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  pomodorosUntilLongBreak: 4,
};

export function usePomodoroTimer(
  initialSettings?: Partial<PomodoroSettings>,
  onPomodoroComplete?: (totalPomodoros: number, totalFocusTime: number) => void
): UsePomodoroTimerReturn {
  const [settings, setSettings] = useState<PomodoroSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });

  const [state, setState] = useState<PomodoroState>({
    phase: 'idle',
    timeRemaining: settings.focusMinutes * 60,
    completedPomodoros: 0,
    isRunning: false,
    totalFocusTime: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onPomodoroComplete);

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onPomodoroComplete;
  }, [onPomodoroComplete]);

  // Calculate phase duration
  const getPhaseDuration = useCallback((phase: PomodoroPhase): number => {
    switch (phase) {
      case 'focus': return settings.focusMinutes * 60;
      case 'shortBreak': return settings.shortBreakMinutes * 60;
      case 'longBreak': return settings.longBreakMinutes * 60;
      default: return settings.focusMinutes * 60;
    }
  }, [settings]);

  // Timer tick effect
  useEffect(() => {
    if (!state.isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.timeRemaining <= 1) {
          // Phase complete
          const wasFocus = prev.phase === 'focus';
          const newCompletedPomodoros = wasFocus
            ? prev.completedPomodoros + 1
            : prev.completedPomodoros;

          const newTotalFocusTime = wasFocus
            ? prev.totalFocusTime + settings.focusMinutes * 60
            : prev.totalFocusTime;

          // Determine next phase
          let nextPhase: PomodoroPhase;
          if (wasFocus) {
            // After focus, take a break
            nextPhase = newCompletedPomodoros % settings.pomodorosUntilLongBreak === 0
              ? 'longBreak'
              : 'shortBreak';

            // Notify
            showNotification(
              'Pomodoro completato!',
              nextPhase === 'longBreak'
                ? 'Ottimo lavoro! Fai una pausa lunga di 15 minuti.'
                : 'Bravo! Fai una pausa di 5 minuti.'
            );

            // Callback
            if (onCompleteRef.current) {
              onCompleteRef.current(newCompletedPomodoros, newTotalFocusTime);
            }
          } else {
            // After break, back to focus
            nextPhase = 'focus';
            showNotification(
              'Pausa finita!',
              'Pronto per un altro pomodoro?'
            );
          }

          const nextDuration = nextPhase === 'focus'
            ? settings.focusMinutes * 60
            : nextPhase === 'shortBreak'
              ? settings.shortBreakMinutes * 60
              : settings.longBreakMinutes * 60;

          return {
            phase: nextPhase,
            timeRemaining: nextDuration,
            completedPomodoros: newCompletedPomodoros,
            isRunning: false, // Pause between phases
            totalFocusTime: newTotalFocusTime,
          };
        }

        return {
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning, settings]);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const start = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: 'focus',
      timeRemaining: settings.focusMinutes * 60,
      isRunning: true,
    }));
  }, [settings.focusMinutes]);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: false }));
  }, []);

  const resume = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: true }));
  }, []);

  const skip = useCallback(() => {
    setState((prev) => {
      const wasFocus = prev.phase === 'focus';
      const newCompletedPomodoros = wasFocus
        ? prev.completedPomodoros + 1
        : prev.completedPomodoros;

      let nextPhase: PomodoroPhase;
      if (wasFocus) {
        nextPhase = newCompletedPomodoros % settings.pomodorosUntilLongBreak === 0
          ? 'longBreak'
          : 'shortBreak';
      } else {
        nextPhase = 'focus';
      }

      return {
        ...prev,
        phase: nextPhase,
        timeRemaining: getPhaseDuration(nextPhase),
        completedPomodoros: newCompletedPomodoros,
        isRunning: false,
      };
    });
  }, [settings.pomodorosUntilLongBreak, getPhaseDuration]);

  const reset = useCallback(() => {
    setState({
      phase: 'idle',
      timeRemaining: settings.focusMinutes * 60,
      completedPomodoros: 0,
      isRunning: false,
      totalFocusTime: 0,
    });
  }, [settings.focusMinutes]);

  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const phaseDuration = getPhaseDuration(state.phase === 'idle' ? 'focus' : state.phase);
  const progress = ((phaseDuration - state.timeRemaining) / phaseDuration) * 100;

  return {
    ...state,
    settings,
    updateSettings,
    start,
    pause,
    resume,
    skip,
    reset,
    formattedTime: formatTime(state.timeRemaining),
    progress,
  };
}
