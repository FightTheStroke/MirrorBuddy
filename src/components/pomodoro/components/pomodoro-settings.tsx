'use client';

import { motion } from 'framer-motion';

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div>
        <label className="text-sm text-white/70 block mb-2">
          Focus (minuti)
        </label>
        <input
          type="range"
          min="5"
          max="60"
          step="5"
          value={focusMinutes}
          onChange={(e) => onFocusChange(Number(e.target.value))}
          className="w-full accent-red-500"
        />
        <div className="text-right text-sm text-white/50">{focusMinutes} min</div>
      </div>

      <div>
        <label className="text-sm text-white/70 block mb-2">
          Pausa breve (minuti)
        </label>
        <input
          type="range"
          min="1"
          max="15"
          step="1"
          value={shortBreakMinutes}
          onChange={(e) => onShortBreakChange(Number(e.target.value))}
          className="w-full accent-green-500"
        />
        <div className="text-right text-sm text-white/50">{shortBreakMinutes} min</div>
      </div>

      <div>
        <label className="text-sm text-white/70 block mb-2">
          Pausa lunga (minuti)
        </label>
        <input
          type="range"
          min="10"
          max="30"
          step="5"
          value={longBreakMinutes}
          onChange={(e) => onLongBreakChange(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="text-right text-sm text-white/50">{longBreakMinutes} min</div>
      </div>

      <p className="text-xs text-white/40 text-center pt-2">
        Pausa lunga ogni {pomodorosUntilLongBreak} pomodori
      </p>
    </motion.div>
  );
}
