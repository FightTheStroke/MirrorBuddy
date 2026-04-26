'use client';

import { motion } from 'framer-motion';
import { CircularWaveform, CanvasWaveform } from '../waveform';
import type { Maestro } from '@/types';

interface SessionVisualizationProps {
  maestro: Maestro;
  isListening: boolean;
  isSpeaking: boolean;
  inputLevel: number;
  outputLevel: number;
  inputAnalyser: AnalyserNode | null;
  stateText: string;
  connectionState: string;
}

export function SessionVisualization({
  maestro,
  isListening,
  isSpeaking,
  inputLevel,
  outputLevel,
  inputAnalyser,
  stateText,
  connectionState,
}: SessionVisualizationProps) {
  return (
    <div className="p-8 flex flex-col items-center gap-6">
      <CircularWaveform
        level={isSpeaking ? outputLevel : inputLevel}
        isActive={isListening || isSpeaking}
        color={maestro.color}
        size={160}
        image={maestro.avatar}
      />

      <motion.div
        key={stateText}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-lg font-medium text-slate-200">{stateText}</p>
        {connectionState === 'connecting' && (
          <div className="mt-2 flex items-center justify-center gap-1">
            <div className="w-2 h-2 rounded-full bg-accent-themed animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-accent-themed animate-pulse delay-100" />
            <div className="w-2 h-2 rounded-full bg-accent-themed animate-pulse delay-200" />
          </div>
        )}
      </motion.div>

      <div className="w-full">
        <CanvasWaveform
          analyser={inputAnalyser}
          isActive={isListening || isSpeaking}
          color={isListening ? '#22C55E' : maestro.color}
          height={64}
        />
      </div>
    </div>
  );
}
