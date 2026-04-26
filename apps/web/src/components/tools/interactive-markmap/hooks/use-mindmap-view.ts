/**
 * View controls hook for Interactive MarkMap
 *
 * Handles zoom, fullscreen, and view reset operations
 */

import { useState, useCallback, useEffect, RefObject } from 'react';
import type { Markmap } from 'markmap-view';
import { logger } from '@/lib/logger';

export interface UseMindmapViewProps {
  markmapRef: RefObject<Markmap | null>;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function useMindmapView({ markmapRef, containerRef }: UseMindmapViewProps) {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomIn = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.rescale(1.25);
    }
    setZoom((z) => Math.min(z * 1.25, 3));
  }, [markmapRef]);

  const handleZoomOut = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.rescale(0.8);
    }
    setZoom((z) => Math.max(z * 0.8, 0.5));
  }, [markmapRef]);

  const handleReset = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.fit();
    }
    setZoom(1);
  }, [markmapRef]);

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

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (markmapRef.current) {
        setTimeout(() => markmapRef.current?.fit(), 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [markmapRef]);

  return {
    zoom,
    isFullscreen,
    handleZoomIn,
    handleZoomOut,
    handleReset,
    handleFullscreen,
  };
}
