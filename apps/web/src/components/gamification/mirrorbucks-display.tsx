/**
 * MirrorBucks Display Component
 * Shows current MirrorBucks count with animated counter
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useProgressStore } from '@/lib/stores/progress-store';

interface MirrorBucksDisplayProps {
  showSeasonBucks?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MirrorBucksDisplay({
  showSeasonBucks = false,
  size = 'md',
  className = '',
}: MirrorBucksDisplayProps) {
  const mirrorBucks = useProgressStore((state) =>
    showSeasonBucks ? state.seasonMirrorBucks : state.mirrorBucks
  );

  const [displayValue, setDisplayValue] = useState(mirrorBucks);
  const isAnimatingRef = useRef(false);
  const prevValueRef = useRef(mirrorBucks);

  // Animate counter when value changes
  const animateCounter = useCallback((start: number, end: number) => {
    if (start === end) return;

    isAnimatingRef.current = true;
    const diff = end - start;
    const duration = 500;
    const steps = 20;
    const increment = diff / steps;
    const stepDuration = duration / steps;

    let current = start;
    const interval = setInterval(() => {
      current += increment;
      if (
        (increment > 0 && current >= end) ||
        (increment < 0 && current <= end)
      ) {
        setDisplayValue(end);
        isAnimatingRef.current = false;
        clearInterval(interval);
      } else {
        setDisplayValue(Math.round(current));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mirrorBucks !== prevValueRef.current) {
      const cleanup = animateCounter(prevValueRef.current, mirrorBucks);
      prevValueRef.current = mirrorBucks;
      return cleanup;
    }
  }, [mirrorBucks, animateCounter]);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg font-semibold',
    lg: 'text-2xl font-bold',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      role="status"
      aria-label={`${displayValue} MirrorBucks`}
    >
      <span className="text-2xl" aria-hidden="true">
        💎
      </span>
      <span className={`${sizeClasses[size]} text-foreground`}>
        {displayValue.toLocaleString()}
      </span>
      <span className="text-sm text-muted-foreground">MB</span>
    </div>
  );
}
