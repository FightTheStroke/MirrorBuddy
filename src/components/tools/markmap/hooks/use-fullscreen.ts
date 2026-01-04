import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { Markmap } from 'markmap-view';
import { logger } from '@/lib/logger';

export function useFullscreen(
  containerRef: RefObject<HTMLDivElement | null> | RefObject<HTMLDivElement>,
  markmapRef: RefObject<Markmap | null> | RefObject<Markmap>
) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      logger.error('Fullscreen error', { error: String(err) });
    }
  }, [containerRef]);

  // Listen for fullscreen changes (user may exit with Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Re-fit the mindmap when entering/exiting fullscreen
      if (markmapRef.current) {
        setTimeout(() => markmapRef.current?.fit(), 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [markmapRef]);

  return { isFullscreen, handleFullscreen };
}
