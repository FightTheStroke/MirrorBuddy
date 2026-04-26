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

export interface DotMatrixVisualizerProps {
  /** Web Audio API AnalyserNode for frequency data */
  analyser: AnalyserNode | null;
  /** Whether the visualizer should animate */
  isActive: boolean;
  /** Whether the AI is currently speaking (fallback animation) */
  isSpeaking?: boolean;
  /** Dot color in hex format */
  color?: string;
  /** Number of rows in the grid */
  rows?: number;
  /** Number of columns in the grid */
  cols?: number;
  /** Size of each dot in pixels */
  dotSize?: number;
  /** Gap between dots in pixels */
  gap?: number;
  /** Additional CSS classes */
  className?: string;
}
