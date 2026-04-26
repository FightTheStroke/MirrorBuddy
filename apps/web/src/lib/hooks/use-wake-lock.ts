'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Prevents screen sleep using the Screen Wake Lock API.
 * Acquires lock when `enabled` is true, releases on disable or unmount.
 * Re-acquires on tab visibility change (browser releases lock on hidden).
 */
export function useWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current.addEventListener('release', () => {
        wakeLockRef.current = null;
      });
    } catch {
      // Wake lock request failed (e.g., low battery, permissions)
    }
  }, []);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Already released
      }
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      release();
      return;
    }

    acquire();

    // Re-acquire when tab becomes visible (browser releases on hidden)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        acquire();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      release();
    };
  }, [enabled, acquire, release]);
}
