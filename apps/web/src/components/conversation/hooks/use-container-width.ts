'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Hook to monitor container width and determine if labels should be hidden
 * @param threshold - Minimum width per button to show labels (default: 80px)
 * @param buttonCount - Number of buttons in the container
 * @returns Object with container ref and whether labels should be hidden
 */
export function useContainerWidth(
  threshold: number = 80,
  buttonCount: number = 9
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hideLabels, setHideLabels] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateVisibility = () => {
      const containerWidth = container.offsetWidth;
      if (containerWidth === 0) {
        // Container not yet measured, try again after a short delay
        setTimeout(updateVisibility, 10);
        return;
      }
      const minWidthNeeded = threshold * buttonCount;
      setHideLabels(containerWidth < minWidthNeeded);
    };

    // Initial check with a small delay to ensure container is rendered
    const timeoutId = setTimeout(updateVisibility, 0);

    // Use ResizeObserver for better performance
    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to batch updates
      requestAnimationFrame(updateVisibility);
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [threshold, buttonCount]);

  return { containerRef, hideLabels };
}
