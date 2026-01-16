'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { WaveformProps } from './types';

export function Waveform({
  level,
  isActive,
  color = '#3B82F6',
  barCount = 20,
  className,
}: WaveformProps) {
  const bars = useMemo(() => Array.from({ length: barCount }, (_, i) => i), [barCount]);
  const randomFactors = useMemo(
    () => bars.map(() => 0.5 + Math.random() * 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bars derived from barCount
    [barCount]
  );
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    let animationId: number;
    const animate = () => {
      setTime(Date.now());
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isActive]);

  return (
    <div className={cn('flex items-center justify-center gap-1 h-16', className)}>
      {bars.map((i) => {
        const phase = (i / barCount) * Math.PI * 2;
        const baseHeight = 0.3 + Math.sin(phase + time / 500) * 0.2;
        const activeHeight = isActive
          ? level * randomFactors[i]
          : baseHeight * 0.3;

        return (
          <motion.div
            key={i}
            className="rounded-full"
            style={{ backgroundColor: color }}
            animate={{
              height: `${Math.max(8, activeHeight * 64)}px`,
              opacity: isActive ? 0.8 + level * 0.2 : 0.4,
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
              mass: 0.5,
            }}
            initial={{ height: 8, width: 4 }}
          />
        );
      })}
    </div>
  );
}
