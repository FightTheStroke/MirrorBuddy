'use client';

import { motion } from 'framer-motion';
import { useTranslations } from "next-intl";

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
  const t = useTranslations("education");
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
        {t("oggi")}{' '}
        <span className="text-white font-medium">{completedPomodoros} {t("pomodori")}</span>
        {' '}·{' '}
        <span className="text-white font-medium">
          {Math.floor(totalFocusTime / 60)} {t("minDiFocus")}
        </span>
      </p>
    </motion.div>
  );
}
