'use client';

import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';

/** How long a turn-level notice, such as a filtered reply, stays on screen. */
export const TRANSIENT_VOICE_NOTICE_MS = 6000;

/**
 * Shows a turn-level notice through an existing error state, then clears it
 * unless a real error replaced it meanwhile, so the notice never lingers as a
 * connection error that disables the "start voice call" controls.
 */
export function useTransientVoiceNotice(
  setError: Dispatch<SetStateAction<string | null>>,
): (message: string) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  return useCallback(
    (message: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setError(message);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setError((current) => (current === message ? null : current));
      }, TRANSIENT_VOICE_NOTICE_MS);
    },
    [setError],
  );
}
