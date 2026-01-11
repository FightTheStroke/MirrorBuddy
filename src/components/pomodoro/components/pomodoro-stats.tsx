'use client';

import { motion } from 'framer-motion';

interface PomodoroStatsProps {
  completedPomodoros: number;
  totalFocusTime: number;
  pomodorosUntilLongBreak: number;
}

export function PomodoroStats({
  completedPomodoros,
  totalFocusTime,
  pomodorosUntilLongBreak: _pomodorosUntilLongBreak,
}: PomodoroStatsProps) {
  if (completedPomodoros === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 pt-4 border-t border-white/10 text-center"
    >
      <p className="text-sm text-white/50">
        Oggi:{' '}
        <span className="text-white font-medium">{completedPomodoros} pomodori</span>
        {' '}·{' '}
        <span className="text-white font-medium">
          {Math.floor(totalFocusTime / 60)} min di focus
        </span>
      </p>
    </motion.div>
  );
}
