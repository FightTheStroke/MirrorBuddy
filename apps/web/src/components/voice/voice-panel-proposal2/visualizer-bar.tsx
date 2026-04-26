'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VisualizerBarProps {
  offset: number;
  isSpeaking: boolean;
  isListening: boolean;
  isMuted: boolean;
  inputLevel: number;
  outputLevel: number;
  index: number;
}

export function VisualizerBar({
  offset,
  isSpeaking,
  isListening,
  isMuted,
  inputLevel,
  outputLevel,
  index,
}: VisualizerBarProps) {
  const baseHeight = 8;

  const getBarStyle = () => {
    const variance = 1 + (offset % 3) * 0.15;

    if (isSpeaking) {
      const level = outputLevel * variance;
      return {
        height: baseHeight + level * 28,
        opacity: 0.4 + level * 0.6,
      };
    }
    if (isListening && !isMuted) {
      const level = inputLevel * variance;
      return {
        height: baseHeight + level * 32,
        opacity: 0.3 + level * 0.7,
      };
    }
    return { height: baseHeight, opacity: 0.2 };
  };

  const style = getBarStyle();

  return (
    <motion.div
      key={index}
      initial={false}
      animate={{
        height: style.height,
        opacity: style.opacity,
        scaleY: isSpeaking || (isListening && !isMuted) ? 1 : 0.8,
      }}
      transition={{ duration: 0.06, ease: 'easeOut' }}
      className={cn(
        'w-2 rounded-full',
        isSpeaking
          ? 'bg-gradient-to-t from-white/60 to-white'
          : isListening && !isMuted
            ? 'bg-gradient-to-t from-white/40 to-white/90'
            : 'bg-white/20'
      )}
    />
  );
}
