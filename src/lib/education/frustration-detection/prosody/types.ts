/**
 * Types for prosody analysis
 */

export interface ProsodyFeatures {
  /** Fundamental frequency (F0) in Hz */
  pitchMean: number;
  /** Standard deviation of pitch */
  pitchStdDev: number;
  /** Pitch range (max - min) */
  pitchRange: number;
  /** Root mean square of amplitude */
  volumeRMS: number;
  /** Volume variance */
  volumeVariance: number;
  /** Detected speech rate estimate */
  speechRateEstimate: number;
  /** Ratio of silence to speech */
  silenceRatio: number;
  /** Energy in low frequencies (typically tension) */
  lowFreqEnergy: number;
  /** Energy in high frequencies (typically clarity) */
  highFreqEnergy: number;
}

export interface ProsodyAnalysisConfig {
  /** Sample rate of audio (default: 16000) */
  sampleRate: number;
  /** FFT size for frequency analysis (default: 2048) */
  fftSize: number;
  /** Minimum pitch to detect in Hz (default: 75) */
  minPitch: number;
  /** Maximum pitch to detect in Hz (default: 500) */
  maxPitch: number;
  /** Threshold for voice activity detection (default: 0.01) */
  vadThreshold: number;
}

export interface EmotionalIndicators {
  /** Frustration level (0-1) */
  frustration: number;
  /** Stress level (0-1) */
  stress: number;
  /** Confusion indicator (0-1) */
  confusion: number;
  /** Engagement level (0-1) - low may indicate boredom/giving up */
  engagement: number;
  /** Overall emotional valence (-1 to 1, negative = distressed) */
  valence: number;
}

export interface ProsodyResult {
  features: ProsodyFeatures;
  emotions: EmotionalIndicators;
  /** Confidence in the analysis (0-1) */
  confidence: number;
  /** Duration analyzed in milliseconds */
  durationMs: number;
  /** Whether voice was detected */
  voiceDetected: boolean;
}

export interface RealTimeProbe {
  /** Current volume level (0-1) */
  volume: number;
  /** Current pitch estimate (Hz, 0 if no voice) */
  pitch: number;
  /** Voice activity detected */
  voiceActive: boolean;
  /** Timestamp */
  timestamp: number;
}
