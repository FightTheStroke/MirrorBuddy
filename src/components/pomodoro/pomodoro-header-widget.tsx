'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, Coffee, Brain, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePomodoroStore, PomodoroPhase } from '@/lib/stores/pomodoro-store';
import { useProgressStore } from '@/lib/stores/app-store';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import { useAmbientAudioStore } from '@/lib/stores/ambient-audio-store';
import toast from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { POMODORO_XP } from '@/lib/constants/xp-rewards';

const PHASE_CONFIG: Record<PomodoroPhase, { color: string; bgColor: string; icon: React.ReactNode }> = {
  idle: { color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: <Timer className="w-3.5 h-3.5" /> },
  focus: { color: 'text-red-400', bgColor: 'bg-red-500/20', icon: <Brain className="w-3.5 h-3.5" /> },
  shortBreak: { color: 'text-green-400', bgColor: 'bg-green-500/20', icon: <Coffee className="w-3.5 h-3.5" /> },
  longBreak: { color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: <Coffee className="w-3.5 h-3.5" /> },
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

function showNotification(title: string, body: string) {
  // Check if break reminders are enabled
  const { breakReminders } = useAccessibilityStore.getState().settings;
  if (!breakReminders) return;

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      tag: 'pomodoro',
      requireInteraction: true,
    });
  }
}

export function PomodoroHeaderWidget() {
  const {
    phase,
    timeRemaining,
    isRunning,
    completedPomodoros,
    settings,
    setPhase,
    setTimeRemaining,
    setIsRunning,
    incrementPomodoros,
    reset,
  } = usePomodoroStore();

  const { addXP, updateStreak } = useProgressStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Ambient audio integration (ADR-0018)
  useEffect(() => {
    const ambientStore = useAmbientAudioStore.getState();
    const { autoStartWithPomodoro, pauseDuringBreak, pomodoroPreset } = ambientStore;

    if (phase === 'focus' && isRunning && autoStartWithPomodoro) {
      // Start ambient audio when focus phase begins
      if (ambientStore.playbackState !== 'playing') {
        ambientStore.applyPreset(pomodoroPreset);
        ambientStore.play();
      }
    } else if ((phase === 'shortBreak' || phase === 'longBreak') && pauseDuringBreak) {
      // Pause during breaks if setting enabled
      if (ambientStore.playbackState === 'playing') {
        ambientStore.pause();
      }
    }
  }, [phase, isRunning]);

  // Timer tick
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      const currentTime = usePomodoroStore.getState().timeRemaining;
      const currentPhase = usePomodoroStore.getState().phase;

      if (currentTime <= 1) {
        // Phase complete
        const wasFocus = currentPhase === 'focus';
        const currentCompleted = usePomodoroStore.getState().completedPomodoros;
        const currentTodayPomodoros = usePomodoroStore.getState().todayPomodoros;

        if (wasFocus) {
          incrementPomodoros();
          const newCompleted = currentCompleted + 1;
          const isLongBreak = newCompleted % settings.pomodorosUntilLongBreak === 0;

          // Calculate XP reward
          let xpEarned = POMODORO_XP.SINGLE;
          const bonuses: string[] = [];

          // First pomodoro of the day bonus
          if (currentTodayPomodoros === 0) {
            xpEarned += POMODORO_XP.FIRST_OF_DAY;
            bonuses.push(`+${POMODORO_XP.FIRST_OF_DAY} primo del giorno`);
          }

          // Cycle completion bonus (every 4 pomodoros)
          if (isLongBreak) {
            xpEarned += POMODORO_XP.CYCLE_BONUS;
            bonuses.push(`+${POMODORO_XP.CYCLE_BONUS} ciclo completo`);
          }

          // Award XP and update streak
          addXP(xpEarned);
          updateStreak();

          const nextPhase = isLongBreak ? 'longBreak' : 'shortBreak';
          const nextTime = isLongBreak ? settings.longBreakMinutes * 60 : settings.shortBreakMinutes * 60;

          setPhase(nextPhase);
          setTimeRemaining(nextTime);
          setIsRunning(false);

          // Notification with XP info
          const bonusText = bonuses.length > 0 ? ` (${bonuses.join(', ')})` : '';
          const notificationBody = isLongBreak
            ? `Ottimo lavoro! Fai una pausa lunga di ${settings.longBreakMinutes} minuti.${bonusText}`
            : `Bravo! Fai una pausa di ${settings.shortBreakMinutes} minuti.${bonusText}`;

          // Browser notification (if permitted)
          showNotification(`Pomodoro completato! +${xpEarned} XP`, notificationBody);

          // Toast notification (always visible)
          toast.success(
            `Pomodoro completato! +${xpEarned} XP`,
            notificationBody,
            { duration: 6000 }
          );
        } else {
          // Break ended
          setPhase('focus');
          setTimeRemaining(settings.focusMinutes * 60);
          setIsRunning(false);

          showNotification('Pausa finita!', 'Pronto per un altro pomodoro?');
        }
      } else {
        setTimeRemaining(currentTime - 1);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, settings, setPhase, setTimeRemaining, setIsRunning, incrementPomodoros, addXP, updateStreak]);

  const handleStart = useCallback(() => {
    setPhase('focus');
    setTimeRemaining(settings.focusMinutes * 60);
    setIsRunning(true);
  }, [settings.focusMinutes, setPhase, setTimeRemaining, setIsRunning]);

  const handleToggle = useCallback(() => {
    setIsRunning(!isRunning);
  }, [isRunning, setIsRunning]);

  const handleStop = useCallback(() => {
    reset();
  }, [reset]);

  const phaseConfig = PHASE_CONFIG[phase];

  // Don't show if idle
  if (phase === 'idle') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleStart}
        className="h-8 gap-1.5 text-slate-500 hover:text-purple-500 hover:bg-purple-500/10"
        title="Avvia Pomodoro Timer"
      >
        <Timer className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">Pomodoro</span>
      </Button>
    );
  }

  // Active timer widget
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn(
          'flex items-center gap-2 px-2.5 py-1.5 rounded-full border',
          phaseConfig.bgColor,
          phase === 'focus' ? 'border-red-500/30' :
          phase === 'shortBreak' ? 'border-green-500/30' :
          'border-blue-500/30'
        )}
      >
        {/* Phase icon */}
        <span className={phaseConfig.color}>{phaseConfig.icon}</span>

        {/* Time */}
        <span className={cn('font-mono font-bold text-sm', phaseConfig.color)}>
          {formatTime(timeRemaining)}
        </span>

        {/* Pomodoro count */}
        <div className="flex gap-0.5">
          {Array.from({ length: settings.pomodorosUntilLongBreak }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                i < completedPomodoros % settings.pomodorosUntilLongBreak
                  ? 'bg-red-500'
                  : 'bg-white/20'
              )}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 ml-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className={cn(
              'h-6 w-6',
              isRunning
                ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/20'
                : 'text-green-400 hover:text-green-300 hover:bg-green-500/20'
            )}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStop}
            className="h-6 w-6 text-slate-400 hover:text-red-400 hover:bg-red-500/20"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
