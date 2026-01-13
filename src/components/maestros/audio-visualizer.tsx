'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  isConnected: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  isMuted: boolean;
  inputLevel: number;
  outputLevel: number;
  barOffsets: number[];
}

export function AudioVisualizer({
  isConnected,
  isSpeaking,
  isListening,
  isMuted,
  inputLevel,
  outputLevel,
  barOffsets,
}: AudioVisualizerProps) {
  if (!isConnected) return null;

  return (
    <div className="flex items-center gap-1 h-8 px-2 bg-white/10 rounded-lg">
      {barOffsets.map((offset, i) => {
        const baseHeight = 6;
        const variance = 1 + (offset % 3) * 0.15;

        const getBarStyle = () => {
          if (isSpeaking) {
            const level = outputLevel * variance;
            return {
              height: baseHeight + level * 20,
              opacity: 0.4 + level * 0.6,
            };
          }
          if (isListening && !isMuted) {
            const level = inputLevel * variance;
            return {
              height: baseHeight + level * 24,
              opacity: 0.3 + level * 0.7,
            };
          }
          return { height: baseHeight, opacity: 0.2 };
        };

        const style = getBarStyle();

        return (
          <motion.div
            key={i}
            initial={false}
            animate={{
              height: style.height,
              opacity: style.opacity,
              scaleY: isSpeaking || (isListening && !isMuted) ? 1 : 0.8,
            }}
            transition={{ duration: 0.06, ease: 'easeOut' }}
            className={cn(
              'w-1.5 rounded-full',
              isSpeaking
                ? 'bg-gradient-to-t from-white/60 to-white'
                : isListening && !isMuted
                  ? 'bg-gradient-to-t from-white/40 to-white/90'
                  : 'bg-white/20'
            )}
          />
        );
      })}
    </div>
  );
}
