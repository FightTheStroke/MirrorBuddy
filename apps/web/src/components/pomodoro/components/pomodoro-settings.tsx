"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface PomodoroSettingsProps {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  pomodorosUntilLongBreak: number;
  onFocusChange: (minutes: number) => void;
  onShortBreakChange: (minutes: number) => void;
  onLongBreakChange: (minutes: number) => void;
}

export function PomodoroSettings({
  focusMinutes,
  shortBreakMinutes,
  longBreakMinutes,
  pomodorosUntilLongBreak,
  onFocusChange,
  onShortBreakChange,
  onLongBreakChange,
}: PomodoroSettingsProps) {
  const t = useTranslations("education");
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div>
        <label
          htmlFor="pomodoro-focus-minutes"
          className="text-sm text-white/70 block mb-2"
        >
          {t("focusMinuti")}
        </label>
        <input
          type="range"
          id="pomodoro-focus-minutes"
          min="5"
          max="60"
          step="5"
          value={focusMinutes}
          onChange={(e) => onFocusChange(Number(e.target.value))}
          className="w-full accent-red-500"
        />
        <div className="text-right text-sm text-white/50">
          {focusMinutes} {t("min2")}
        </div>
      </div>

      <div>
        <label
          htmlFor="pomodoro-short-break"
          className="text-sm text-white/70 block mb-2"
        >
          {t("pausaBreveMinuti")}
        </label>
        <input
          type="range"
          id="pomodoro-short-break"
          min="1"
          max="15"
          step="1"
          value={shortBreakMinutes}
          onChange={(e) => onShortBreakChange(Number(e.target.value))}
          className="w-full accent-green-500"
        />
        <div className="text-right text-sm text-white/50">
          {shortBreakMinutes} {t("min1")}
        </div>
      </div>

      <div>
        <label
          htmlFor="pomodoro-long-break"
          className="text-sm text-white/70 block mb-2"
        >
          {t("pausaLungaMinuti")}
        </label>
        <input
          type="range"
          id="pomodoro-long-break"
          min="10"
          max="30"
          step="5"
          value={longBreakMinutes}
          onChange={(e) => onLongBreakChange(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="text-right text-sm text-white/50">
          {longBreakMinutes} {t("min")}
        </div>
      </div>

      <p className="text-xs text-white/40 text-center pt-2">
        {t("pausaLungaOgni")} {pomodorosUntilLongBreak} {t("pomodori")}
      </p>
    </motion.div>
  );
}
