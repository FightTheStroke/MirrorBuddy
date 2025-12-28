'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WaveformProps {
  level: number; // 0-1
  isActive: boolean;
  color?: string;
  barCount?: number;
  className?: string;
}

export function Waveform({
  level,
  isActive,
  color = '#3B82F6',
  barCount = 20,
  className,
}: WaveformProps) {
  const bars = useMemo(() => Array.from({ length: barCount }, (_, i) => i), [barCount]);
  // Pre-compute random factors for each bar (stable between renders)
  const randomFactors = useMemo(
    () => bars.map(() => 0.5 + Math.random() * 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [barCount] // Only regenerate when bar count changes
  );
  const [time, setTime] = useState(0);

  // Animation loop for wave effect
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
        // Create natural-looking wave pattern using state-based time
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

// Circular waveform for avatar
interface CircularWaveformProps {
  level: number;
  isActive: boolean;
  color?: string;
  size?: number;
  image?: string;
  className?: string;
}

export function CircularWaveform({
  level,
  isActive,
  color = '#3B82F6',
  size = 120,
  image,
  className,
}: CircularWaveformProps) {
  const innerSize = Math.round(size * 0.7);

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {/* Outer pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ borderColor: color, borderWidth: 2 }}
        animate={{
          scale: isActive ? [1, 1.1 + level * 0.3, 1] : 1,
          opacity: isActive ? [0.5, 0.2, 0.5] : 0.3,
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Middle ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.85,
          height: size * 0.85,
          borderColor: color,
          borderWidth: 3,
        }}
        animate={{
          scale: isActive ? [1, 1.05 + level * 0.2, 1] : 1,
          opacity: isActive ? [0.6, 0.3, 0.6] : 0.4,
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.2,
        }}
      />

      {/* Inner circle with avatar */}
      <motion.div
        className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{
          width: innerSize,
          height: innerSize,
          backgroundColor: color,
        }}
        animate={{
          scale: isActive ? 1 + level * 0.05 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
      >
        {image ? (
          <Image
            src={image}
            alt="Avatar"
            width={innerSize}
            height={innerSize}
            className="w-full h-full object-cover"
          />
        ) : null}
      </motion.div>
    </div>
  );
}
