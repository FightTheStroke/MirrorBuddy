/**
 * @file slider.tsx
 * @brief Slider component for accessibility settings
 */

import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility";

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = "",
}: SliderProps) {
  const { settings } = useAccessibilityStore();

  const stepValues: number[] = [];
  for (let v = min; v <= max; v = Math.round((v + step) * 10) / 10) {
    stepValues.push(v);
  }

  const currentIndex = stepValues.findIndex((v) => Math.abs(v - value) < 0.01);
  const canDecrease = currentIndex > 0;
  const canIncrease = currentIndex < stepValues.length - 1;

  const handleDecrease = () => {
    if (canDecrease) {
      onChange(stepValues[currentIndex - 1]);
    }
  };

  const handleIncrease = () => {
    if (canIncrease) {
      onChange(stepValues[currentIndex + 1]);
    }
  };

  return (
    <div
      className={cn(
        "p-4 rounded-lg",
        settings.highContrast
          ? "bg-gray-900 border border-gray-700"
          : "bg-slate-50 dark:bg-slate-800/50",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            "font-medium",
            settings.highContrast
              ? "text-white"
              : "text-slate-900 dark:text-white",
            settings.dyslexiaFont && "tracking-wide",
          )}
          style={{ fontSize: `${14 * (settings.largeText ? 1.2 : 1)}px` }}
        >
          {label}
        </span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleDecrease}
          disabled={!canDecrease}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-all",
            settings.highContrast
              ? "bg-gray-700 text-yellow-400 hover:bg-gray-600 disabled:opacity-30"
              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-30",
          )}
          aria-label="Diminuisci"
        >
          −
        </button>

        <span
          className={cn(
            "font-mono text-2xl min-w-[80px] text-center",
            settings.highContrast ? "text-yellow-400" : "text-blue-500",
          )}
        >
          {value.toFixed(1)}
          {unit}
        </span>

        <button
          type="button"
          onClick={handleIncrease}
          disabled={!canIncrease}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-all",
            settings.highContrast
              ? "bg-gray-700 text-yellow-400 hover:bg-gray-600 disabled:opacity-30"
              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-30",
          )}
          aria-label="Aumenta"
        >
          +
        </button>
      </div>

      <div className="flex justify-center gap-1.5 mt-3">
        {stepValues.map((v, i) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              i === currentIndex
                ? settings.highContrast
                  ? "bg-yellow-400 w-3"
                  : "bg-accent-themed w-3"
                : settings.highContrast
                  ? "bg-gray-600"
                  : "bg-slate-300 dark:bg-slate-600",
            )}
            aria-label={`${v}${unit}`}
          />
        ))}
      </div>
    </div>
  );
}
