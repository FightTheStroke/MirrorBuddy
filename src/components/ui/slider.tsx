"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled = false,
}: SliderProps) {
  const sliderRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const percentage = ((value[0] - min) / (max - min)) * 100;

  const updateValue = React.useCallback(
    (clientX: number) => {
      if (!sliderRef.current || disabled) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const percent = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      const rawValue = min + percent * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));

      onValueChange([clampedValue]);
    },
    [min, max, step, onValueChange, disabled],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    updateValue(e.clientX);
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateValue(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, updateValue]);

  return (
    <div
      ref={sliderRef}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value[0]}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
      onMouseDown={handleMouseDown}
      onKeyDown={(e) => {
        if (disabled) return;
        const step = (max - min) / 10;
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          onValueChange([Math.max(min, value[0] - step)]);
        } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          onValueChange([Math.min(max, value[0] + step)]);
        } else if (e.key === "Home") {
          e.preventDefault();
          onValueChange([min]);
        } else if (e.key === "End") {
          e.preventDefault();
          onValueChange([max]);
        }
      }}
    >
      {/* Track */}
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 cursor-pointer">
        {/* Filled track */}
        <div
          className="absolute h-full bg-accent-themed"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Thumb */}
      <div
        className={cn(
          "absolute block h-5 w-5 rounded-full border-2 border-accent-themed bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed focus-visible:ring-offset-2 disabled:pointer-events-none dark:bg-slate-950 dark:ring-offset-slate-950",
          isDragging && "scale-110",
        )}
        style={{ left: `calc(${percentage}% - 10px)` }}
      />

      {/* Hidden input for accessibility */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => onValueChange([parseFloat(e.target.value)])}
        className="sr-only"
        disabled={disabled}
      />
    </div>
  );
}
