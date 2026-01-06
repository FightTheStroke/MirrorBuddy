import { useState, useCallback } from 'react';
import type { UseMindMapLiveOptions } from '../types';

export function useMindMapLive({ sessionId, onComplete, onError }: UseMindMapLiveOptions) {
  const [isActive, setIsActive] = useState(false);
  const [toolId, setToolId] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');

  const start = useCallback((id: string, initialTitle?: string) => {
    setToolId(id);
    setContent(initialTitle ? `# ${initialTitle}\n` : '');
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
    setToolId(null);
  }, []);

  const handleComplete = useCallback(
    (finalContent: string) => {
      setContent(finalContent);
      onComplete?.(finalContent);
    },
    [onComplete]
  );

  const handleError = useCallback(
    (error: string) => {
      onError?.(error);
    },
    [onError]
  );

  return {
    isActive,
    toolId,
    content,
    start,
    stop,
    sessionId,
    handleComplete,
    handleError,
  };
}

