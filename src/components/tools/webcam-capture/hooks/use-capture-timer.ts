/**
 * @file use-capture-timer.ts
 * @brief Hook for capture timer and countdown logic
 */

import { useState, useCallback, useEffect } from "react";
import type { TimerOption } from "../constants";

interface UseCaptureTimerProps {
  showTimer: boolean;
  onCaptureComplete: () => void;
}

export function useCaptureTimer({
  showTimer,
  onCaptureComplete,
}: UseCaptureTimerProps) {
  const [selectedTimer, setSelectedTimer] = useState<TimerOption>(
    showTimer ? 3 : 0,
  );
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState(false);

  const handleCapture = useCallback(() => {
    if (selectedTimer > 0) {
      setCountdown(selectedTimer);
    } else {
      setShowFlash(true);
      setTimeout(() => {
        setShowFlash(false);
        onCaptureComplete();
      }, 150);
    }
  }, [selectedTimer, onCaptureComplete]);

  const handleCancelCountdown = useCallback(() => {
    setCountdown(null);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      setShowFlash(true);
      setTimeout(() => {
        setShowFlash(false);
        onCaptureComplete();
      }, 150);
      setCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  return {
    selectedTimer,
    setSelectedTimer,
    countdown,
    showFlash,
    handleCapture,
    handleCancelCountdown,
  };
}
