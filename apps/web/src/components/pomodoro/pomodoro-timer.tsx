'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Settings,
  X,
  Coffee,
  Brain,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePomodoroTimer, PomodoroPhase } from '@/lib/hooks/use-pomodoro-timer';
import { PomodoroSettings } from './components/pomodoro-settings';
import { PomodoroStats } from './components/pomodoro-stats';
import { cn } from '@/lib/utils';
import { useTranslations } from "next-intl";

interface PomodoroTimerProps {
  onPomodoroComplete?: (totalPomodoros: number, totalFocusTime: number) => void;
  compact?: boolean;
  className?: string;
}

const PHASE_CONFIG: Record<PomodoroPhase, { label: string; color: string; icon: React.ReactNode }> = {
  idle: { label: 'Pronto', color: 'text-slate-400', icon: <Timer className="w-5 h-5" /> },
  focus: { label: 'Focus', color: 'text-red-400', icon: <Brain className="w-5 h-5" /> },
  shortBreak: { label: 'Pausa', color: 'text-green-400', icon: <Coffee className="w-5 h-5" /> },
  longBreak: { label: 'Pausa lunga', color: 'text-blue-400', icon: <Coffee className="w-5 h-5" /> },
};

export function PomodoroTimer({ onPomodoroComplete, compact = false, className }: PomodoroTimerProps) {
  const t = useTranslations("education");
  const [showSettings, setShowSettings] = useState(false);
  const timer = usePomodoroTimer(undefined, onPomodoroComplete);

  const phaseConfig = PHASE_CONFIG[timer.phase];

  // Circular progress
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (timer.progress / 100) * circumference;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10', className)}>
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-white/10"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={cn(
                'transition-all duration-1000',
                timer.phase === 'focus' ? 'text-red-500' :
                timer.phase === 'shortBreak' ? 'text-green-500' :
                timer.phase === 'longBreak' ? 'text-blue-500' :
                'text-slate-500'
              )}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-mono font-bold text-white">
              {timer.formattedTime}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className={cn('text-sm font-medium', phaseConfig.color)}>
            {phaseConfig.label}
          </div>
          <div className="text-xs text-white/50">
            {timer.completedPomodoros} {t("pomodori")}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {timer.phase === 'idle' ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={timer.start}
              className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/20"
            >
              <Play className="w-4 h-4" />
            </Button>
          ) : timer.isRunning ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={timer.pause}
              className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20"
            >
              <Pause className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={timer.resume}
              className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/20"
            >
              <Play className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-6 rounded-2xl bg-white/5 border border-white/10', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">{t("pomodoroTimer")}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
          className="h-8 w-8 text-white/60 hover:text-white"
        >
          {showSettings ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {showSettings ? (
          <PomodoroSettings
            key="settings"
            focusMinutes={timer.settings.focusMinutes}
            shortBreakMinutes={timer.settings.shortBreakMinutes}
            longBreakMinutes={timer.settings.longBreakMinutes}
            pomodorosUntilLongBreak={timer.settings.pomodorosUntilLongBreak}
            onFocusChange={(m) => timer.updateSettings({ focusMinutes: m })}
            onShortBreakChange={(m) => timer.updateSettings({ shortBreakMinutes: m })}
            onLongBreakChange={(m) => timer.updateSettings({ longBreakMinutes: m })}
          />
        ) : (
          <motion.div
            key="timer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Timer Circle */}
            <div className="relative w-48 h-48 mx-auto mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-white/10"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className={cn(
                    'transition-all duration-1000',
                    timer.phase === 'focus' ? 'text-red-500' :
                    timer.phase === 'shortBreak' ? 'text-green-500' :
                    timer.phase === 'longBreak' ? 'text-blue-500' :
                    'text-slate-500'
                  )}
                />
              </svg>

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={cn('flex items-center gap-2 mb-1', phaseConfig.color)}>
                  {phaseConfig.icon}
                  <span className="text-sm font-medium">{phaseConfig.label}</span>
                </div>
                <span className="text-4xl font-mono font-bold text-white">
                  {timer.formattedTime}
                </span>
              </div>
            </div>

            {/* Pomodoro counter */}
            <div className="flex justify-center gap-2 mb-6">
              {Array.from({ length: timer.settings.pomodorosUntilLongBreak }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-3 h-3 rounded-full transition-colors',
                    i < timer.completedPomodoros % timer.settings.pomodorosUntilLongBreak
                      ? 'bg-red-500'
                      : 'bg-white/20'
                  )}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-3">
              {timer.phase === 'idle' ? (
                <Button
                  onClick={timer.start}
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {t("iniziaFocus")}
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={timer.reset}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>

                  {timer.isRunning ? (
                    <Button
                      onClick={timer.pause}
                      className="bg-amber-500 hover:bg-amber-600 min-w-[120px]"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      {t("pausa")}
                    </Button>
                  ) : (
                    <Button
                      onClick={timer.resume}
                      className="bg-green-500 hover:bg-green-600 min-w-[120px]"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {t("riprendi")}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={timer.skip}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>

            {/* Stats */}
            <PomodoroStats
              completedPomodoros={timer.completedPomodoros}
              totalFocusTime={timer.totalFocusTime}
              pomodorosUntilLongBreak={timer.settings.pomodorosUntilLongBreak}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
