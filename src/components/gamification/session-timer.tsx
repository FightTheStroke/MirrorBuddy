/**
 * Session Timer Component
 * Visible MM:SS timer with auto-pause functionality
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface SessionTimerProps {
  onPause?: () => void;
  onResume?: () => void;
  className?: string;
}

type TimerState = 'active' | 'warning' | 'paused';

const INACTIVITY_THRESHOLD = 60000; // 60 seconds
const WARNING_THRESHOLD = 45000; // 45 seconds

export function SessionTimer({ onPause, onResume, className = '' }: SessionTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>('active');
  const lastActivityRef = useRef<number>(0);

  // Initialize last activity time on mount
  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Update last activity time
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (timerState === 'paused') {
      setTimerState('active');
      onResume?.();
    } else if (timerState === 'warning') {
      setTimerState('active');
    }
  }, [timerState, onResume]);

  // Setup activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [handleActivity]);

  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTimerState('paused');
        onPause?.();
      } else {
        lastActivityRef.current = Date.now();
        setTimerState('active');
        onResume?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onPause, onResume]);

  // Main timer - increments elapsed time
  useEffect(() => {
    if (timerState === 'active') {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerState]);

  // Inactivity checker
  useEffect(() => {
    inactivityCheckRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;

      if (timeSinceActivity >= INACTIVITY_THRESHOLD && timerState !== 'paused') {
        setTimerState('paused');
        onPause?.();
      } else if (
        timeSinceActivity >= WARNING_THRESHOLD &&
        timeSinceActivity < INACTIVITY_THRESHOLD &&
        timerState === 'active'
      ) {
        setTimerState('warning');
      }
    }, 1000);

    return () => {
      if (inactivityCheckRef.current) {
        clearInterval(inactivityCheckRef.current);
      }
    };
  }, [timerState, onPause]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stateColors: Record<TimerState, string> = {
    active: 'text-green-500 border-green-500/30 bg-green-500/10',
    warning: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10',
    paused: 'text-gray-500 border-gray-500/30 bg-gray-500/10',
  };

  const stateIcons: Record<TimerState, string> = {
    active: '▶',
    warning: '⚠',
    paused: '⏸',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-mono text-lg transition-all ${stateColors[timerState]} ${className}`}
      role="timer"
      aria-label={`Session timer: ${formatTime(elapsedSeconds)}, ${timerState}`}
    >
      <span className="text-sm" aria-hidden="true">
        {stateIcons[timerState]}
      </span>
      <span className="font-semibold tabular-nums">{formatTime(elapsedSeconds)}</span>
      {timerState === 'paused' && (
        <span className="text-xs text-muted-foreground ml-2">In pausa</span>
      )}
    </div>
  );
}
