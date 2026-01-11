/**
 * Audio Engine Type Definitions
 */

export interface ActiveLayer {
  id: string;
  mode: unknown; // AudioMode from types
  gainNode: GainNode;
  sourceNode: AudioNode | null;
  oscillators?: OscillatorNode[];
  started: boolean;
}

export interface AudioEngineState {
  isInitialized: boolean;
  contextState: string | null;
  activeLayerCount: number;
  isDucked: boolean;
}
