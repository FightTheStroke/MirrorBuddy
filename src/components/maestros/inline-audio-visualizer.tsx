'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface InlineAudioVisualizerProps {
  isConnected: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  isMuted: boolean;
  inputLevel: number;
  outputLevel: number;
  barOffsets: number[];
}

export function InlineAudioVisualizer({
  isConnected,
  isSpeaking,
  isListening,
  isMuted,
  inputLevel,
  outputLevel,
  barOffsets,
}: InlineAudioVisualizerProps) {
  if (!isConnected) return null;

  return (
    <div className="flex items-center gap-1 h-6 px-2 bg-slate-200 dark:bg-slate-700 rounded">
      {barOffsets.map((offset, i) => {
        const baseHeight = 4;
        const variance = 1 + (offset % 3) * 0.15;

        const getBarStyle = () => {
          if (isSpeaking) {
            const level = outputLevel * variance;
            return {
              height: baseHeight + level * 16,
              opacity: 0.4 + level * 0.6,
            };
          }
          if (isListening && !isMuted) {
            const level = inputLevel * variance;
            return {
              height: baseHeight + level * 20,
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
              'w-1 rounded-full',
              isSpeaking
                ? 'bg-green-500'
                : isListening && !isMuted
                  ? 'bg-blue-500'
                  : 'bg-slate-400'
            )}
          />
        );
      })}
    </div>
  );
}
