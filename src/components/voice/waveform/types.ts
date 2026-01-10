/**
 * Types for Waveform components
 */

export interface CanvasWaveformProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  color?: string;
  backgroundColor?: string;
  height?: number;
  className?: string;
}

export interface SimpleLevelWaveformProps {
  level: number; // 0-1
  isActive: boolean;
  color?: string;
  backgroundColor?: string;
  height?: number;
  className?: string;
}

export interface WaveformProps {
  level: number; // 0-1
  isActive: boolean;
  color?: string;
  barCount?: number;
  className?: string;
}

export interface CircularWaveformProps {
  level: number;
  isActive: boolean;
  color?: string;
  size?: number;
  image?: string;
  className?: string;
}
