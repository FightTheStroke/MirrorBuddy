'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CircularWaveformProps } from './types';

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
