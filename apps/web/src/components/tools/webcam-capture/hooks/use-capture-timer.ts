import { useState, useCallback, useEffect, useRef } from 'react';
import type { TimerOption } from '../constants';

interface UseCaptureTimerProps {
  showTimer: boolean;
  onCaptureComplete: () => void;
}

export function useCaptureTimer({ showTimer, onCaptureComplete }: UseCaptureTimerProps) {
  const [selectedTimer, setSelectedTimer] = useState<TimerOption>(showTimer ? 3 : 0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  const captureRef = useRef(onCaptureComplete);
  useEffect(() => {
    captureRef.current = onCaptureComplete;
  }, [onCaptureComplete]);
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  const handleCapture = useCallback(() => {
    if (!mountedRef.current || timerRef.current !== null) return;
    const step = (remaining: number) => {
      if (remaining > 0) {
        setCountdown(remaining);
        timerRef.current = setTimeout(() => step(remaining - 1), 1000);
      } else {
        setCountdown(null);
        setShowFlash(true);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setShowFlash(false);
          captureRef.current();
        }, 150);
      }
    };
    step(selectedTimer);
  }, [selectedTimer]);

  const handleCancelCountdown = useCallback(() => {
    clearTimer();
    setCountdown(null);
    setShowFlash(false);
  }, [clearTimer]);

  return {
    selectedTimer,
    setSelectedTimer,
    countdown,
    showFlash,
    handleCapture,
    handleCancelCountdown,
  };
}
