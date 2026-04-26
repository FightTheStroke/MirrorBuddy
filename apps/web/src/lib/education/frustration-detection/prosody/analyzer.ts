/**
 * Web Audio prosody analyzer
 * Analyzes pitch, volume, and emotional indicators from audio
 */

import type {
  ProsodyFeatures,
  ProsodyAnalysisConfig,
  EmotionalIndicators,
  ProsodyResult,
} from './types';

const DEFAULT_CONFIG: ProsodyAnalysisConfig = {
  sampleRate: 16000,
  fftSize: 2048,
  minPitch: 75, // Hz - typical minimum for human voice
  maxPitch: 500, // Hz - typical maximum for human voice
  vadThreshold: 0.01,
};

/**
 * Detect pitch using autocorrelation
 * Returns pitch in Hz, or 0 if no pitch detected
 */
export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
  minPitch = 75,
  maxPitch = 500
): number {
  const minPeriod = Math.floor(sampleRate / maxPitch);
  const maxPeriod = Math.floor(sampleRate / minPitch);

  // Normalize samples
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const normalized = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    normalized[i] = samples[i] - mean;
  }

  // Autocorrelation
  let bestCorrelation = -1;
  let bestPeriod = 0;

  for (let period = minPeriod; period <= maxPeriod && period < normalized.length / 2; period++) {
    let correlation = 0;
    let energy1 = 0;
    let energy2 = 0;

    for (let i = 0; i < normalized.length - period; i++) {
      correlation += normalized[i] * normalized[i + period];
      energy1 += normalized[i] * normalized[i];
      energy2 += normalized[i + period] * normalized[i + period];
    }

    // Normalized correlation
    const normalizer = Math.sqrt(energy1 * energy2);
    if (normalizer > 0) {
      correlation /= normalizer;
    }

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestPeriod = period;
    }
  }

  // Only return pitch if correlation is strong enough
  if (bestCorrelation > 0.7 && bestPeriod > 0) {
    return sampleRate / bestPeriod;
  }

  return 0;
}

/**
 * Calculate RMS (Root Mean Square) volume
 */
export function calculateRMS(samples: Float32Array): number {
  if (samples.length === 0) return 0;

  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }

  return Math.sqrt(sum / samples.length);
}

/**
 * Calculate variance
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  return Math.sqrt(calculateVariance(values));
}

/**
 * Analyze frequency spectrum energy distribution
 */
export function analyzeSpectrum(
  samples: Float32Array,
  sampleRate: number,
  fftSize: number
): { lowFreqEnergy: number; highFreqEnergy: number } {
  // Simple spectrum analysis using DFT on a window
  const windowSize = Math.min(fftSize, samples.length);
  const halfWindow = Math.floor(windowSize / 2);

  let lowEnergy = 0;
  let highEnergy = 0;

  // Frequency bins
  const freqResolution = sampleRate / windowSize;
  const lowCutoff = 500; // Hz
  const lowBins = Math.floor(lowCutoff / freqResolution);

  // Simplified magnitude calculation for key frequency bands
  for (let k = 1; k < halfWindow; k++) {
    let real = 0;
    let imag = 0;

    for (let n = 0; n < windowSize; n++) {
      const angle = (2 * Math.PI * k * n) / windowSize;
      real += samples[n] * Math.cos(angle);
      imag -= samples[n] * Math.sin(angle);
    }

    const magnitude = Math.sqrt(real * real + imag * imag);

    if (k < lowBins) {
      lowEnergy += magnitude;
    } else {
      highEnergy += magnitude;
    }
  }

  // Normalize
  const total = lowEnergy + highEnergy;
  if (total > 0) {
    lowEnergy /= total;
    highEnergy /= total;
  }

  return { lowFreqEnergy: lowEnergy, highFreqEnergy: highEnergy };
}

/**
 * Analyze prosodic features from audio samples
 */
export function analyzeProsody(
  samples: Float32Array,
  config: Partial<ProsodyAnalysisConfig> = {}
): ProsodyResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Check if we have enough samples
  if (samples.length < cfg.fftSize) {
    return {
      features: {
        pitchMean: 0,
        pitchStdDev: 0,
        pitchRange: 0,
        volumeRMS: 0,
        volumeVariance: 0,
        speechRateEstimate: 0,
        silenceRatio: 1,
        lowFreqEnergy: 0,
        highFreqEnergy: 0,
      },
      emotions: {
        frustration: 0,
        stress: 0,
        confusion: 0,
        engagement: 0,
        valence: 0,
      },
      confidence: 0,
      durationMs: (samples.length / cfg.sampleRate) * 1000,
      voiceDetected: false,
    };
  }

  // Analyze in windows
  const windowSize = cfg.fftSize;
  const hopSize = Math.floor(windowSize / 2);
  const pitches: number[] = [];
  const volumes: number[] = [];
  let voiceFrames = 0;
  let silenceFrames = 0;

  for (let i = 0; i + windowSize <= samples.length; i += hopSize) {
    const window = samples.slice(i, i + windowSize);
    const rms = calculateRMS(window);

    if (rms > cfg.vadThreshold) {
      voiceFrames++;
      const pitch = detectPitch(window, cfg.sampleRate, cfg.minPitch, cfg.maxPitch);
      if (pitch > 0) {
        pitches.push(pitch);
      }
      volumes.push(rms);
    } else {
      silenceFrames++;
    }
  }

  const totalFrames = voiceFrames + silenceFrames;
  const silenceRatio = totalFrames > 0 ? silenceFrames / totalFrames : 1;
  const voiceDetected = voiceFrames > 0;

  // Calculate pitch statistics
  const pitchMean = pitches.length > 0 ? pitches.reduce((a, b) => a + b, 0) / pitches.length : 0;
  const pitchStdDev = pitches.length > 1 ? calculateStdDev(pitches) : 0;
  const pitchRange = pitches.length > 0 ? Math.max(...pitches) - Math.min(...pitches) : 0;

  // Calculate volume statistics
  const volumeRMS = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;
  const volumeVariance = volumes.length > 1 ? calculateVariance(volumes) : 0;

  // Analyze spectrum
  const { lowFreqEnergy, highFreqEnergy } = analyzeSpectrum(samples, cfg.sampleRate, windowSize);

  // Estimate speech rate from pitch transitions
  let transitions = 0;
  for (let i = 1; i < pitches.length; i++) {
    if (Math.abs(pitches[i] - pitches[i - 1]) > 20) {
      transitions++;
    }
  }
  const durationSec = samples.length / cfg.sampleRate;
  const speechRateEstimate = durationSec > 0 ? (transitions * 60) / durationSec : 0;

  const features: ProsodyFeatures = {
    pitchMean,
    pitchStdDev,
    pitchRange,
    volumeRMS,
    volumeVariance,
    speechRateEstimate,
    silenceRatio,
    lowFreqEnergy,
    highFreqEnergy,
  };

  // Infer emotional indicators
  const emotions = inferEmotions(features);

  // Calculate confidence based on voice detection quality
  const confidence = Math.min(1, (voiceFrames / Math.max(totalFrames, 1)) * (pitches.length > 3 ? 1 : 0.5));

  return {
    features,
    emotions,
    confidence,
    durationMs: durationSec * 1000,
    voiceDetected,
  };
}

/**
 * Infer emotional indicators from prosodic features
 */
export function inferEmotions(features: ProsodyFeatures): EmotionalIndicators {
  let frustration = 0;
  let stress = 0;
  let confusion = 0;
  let engagement = 0.5; // Default neutral

  // High pitch variance often indicates frustration/stress
  if (features.pitchStdDev > 50) {
    frustration += 0.2;
    stress += 0.3;
  }

  // Very high or very low pitch can indicate distress
  if (features.pitchMean > 300 || (features.pitchMean > 0 && features.pitchMean < 100)) {
    stress += 0.2;
  }

  // High volume variance suggests emotional speech
  if (features.volumeVariance > 0.01) {
    frustration += 0.15;
    stress += 0.1;
  }

  // High silence ratio suggests hesitation/confusion
  if (features.silenceRatio > 0.4) {
    confusion += 0.3;
    frustration += 0.1;
  }

  // Very slow speech rate suggests struggle
  if (features.speechRateEstimate > 0 && features.speechRateEstimate < 80) {
    confusion += 0.2;
    engagement -= 0.1;
  }

  // Low energy overall suggests disengagement
  if (features.volumeRMS < 0.02) {
    engagement -= 0.2;
    frustration += 0.1; // Might be giving up
  }

  // High low-frequency energy can indicate tension
  if (features.lowFreqEnergy > 0.6) {
    stress += 0.15;
  }

  // Wide pitch range with high volume = possibly frustrated/angry
  if (features.pitchRange > 150 && features.volumeRMS > 0.1) {
    frustration += 0.25;
    stress += 0.2;
  }

  // Clamp values
  frustration = Math.min(1, Math.max(0, frustration));
  stress = Math.min(1, Math.max(0, stress));
  confusion = Math.min(1, Math.max(0, confusion));
  engagement = Math.min(1, Math.max(0, engagement));

  // Calculate valence (negative = distressed, positive = okay)
  const valence = (engagement - frustration - stress * 0.5 - confusion * 0.3) / 2;

  return {
    frustration,
    stress,
    confusion,
    engagement,
    valence: Math.max(-1, Math.min(1, valence)),
  };
}
