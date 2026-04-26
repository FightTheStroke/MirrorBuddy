import { useCallback, useState } from 'react';
import type { CallingState } from '@/components/voice/CallingOverlay';

const CONNECTED_AUTO_HIDE_MS = 2000;

export function useCallingState() {
  const [callingState, setCallingState] = useState<CallingState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const setRinging = useCallback(() => {
    setErrorMessage(undefined);
    setCallingState('ringing');
  }, []);

  const setConnected = useCallback(() => {
    setErrorMessage(undefined);
    setCallingState('connected');
    window.setTimeout(() => {
      setCallingState('idle');
    }, CONNECTED_AUTO_HIDE_MS);
  }, []);

  const setError = useCallback((message: string) => {
    setErrorMessage(message);
    setCallingState('error');
  }, []);

  const reset = useCallback(() => {
    setErrorMessage(undefined);
    setCallingState('idle');
  }, []);

  return {
    callingState,
    errorMessage,
    setRinging,
    setConnected,
    setError,
    reset,
  };
}
