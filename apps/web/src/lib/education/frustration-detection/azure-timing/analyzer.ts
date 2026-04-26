/**
 * Azure Speech timing analyzer
 * Extracts hesitation indicators from word-level timing data
 */

import type {
  WordTiming,
  SpeechSegment,
  PauseInfo,
  HesitationIndicators,
  TimingAnalysisResult,
} from './types';

// Pause thresholds in milliseconds
const PAUSE_THRESHOLDS = {
  micro: 150, // Normal word gap
  short: 300, // Brief pause
  medium: 800, // Noticeable pause
  long: 1500, // Long pause (hesitation)
  sigh: 2500, // Very long (possible sigh/frustration)
};

// Speech rate thresholds (words per minute)
const SPEED_THRESHOLDS = {
  very_slow: 80,
  slow: 110,
  normal_low: 130,
  normal_high: 160,
  fast: 190,
};

/**
 * Parse Azure Speech SDK recognition result into WordTiming array
 * This handles the NBest[0].Words format from Azure
 */
export function parseAzureResult(result: {
  NBest?: Array<{
    Words?: Array<{
      Word: string;
      Offset: number; // In 100-nanosecond units
      Duration: number; // In 100-nanosecond units
      Confidence: number;
    }>;
  }>;
}): WordTiming[] {
  const nBest = result.NBest?.[0];
  if (!nBest?.Words) return [];

  return nBest.Words.map(w => ({
    word: w.Word,
    offset: w.Offset / 10000, // Convert to milliseconds
    duration: w.Duration / 10000,
    confidence: w.Confidence,
  }));
}

/**
 * Detect pauses between words
 */
export function detectPauses(words: WordTiming[]): PauseInfo[] {
  const pauses: PauseInfo[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    const current = words[i];
    const next = words[i + 1];

    const gap = next.offset - (current.offset + current.duration);

    if (gap > PAUSE_THRESHOLDS.micro) {
      let type: PauseInfo['type'];

      if (gap >= PAUSE_THRESHOLDS.sigh) {
        type = 'sigh';
      } else if (gap >= PAUSE_THRESHOLDS.long) {
        type = 'long';
      } else if (gap >= PAUSE_THRESHOLDS.medium) {
        type = 'medium';
      } else if (gap >= PAUSE_THRESHOLDS.short) {
        type = 'short';
      } else {
        type = 'micro';
      }

      pauses.push({
        duration: gap,
        afterWordIndex: i,
        type,
      });
    }
  }

  return pauses;
}

/**
 * Calculate hesitation indicators from word timings
 */
export function calculateHesitation(words: WordTiming[]): HesitationIndicators {
  if (words.length === 0) {
    return {
      pauseRatio: 0,
      longPauseCount: 0,
      mediumPauseCount: 0,
      avgConfidence: 1,
      lowConfidenceWords: 0,
      speechRate: 0,
      durationVariance: 0,
      hesitationScore: 0,
    };
  }

  const pauses = detectPauses(words);

  // Calculate total speech and pause time
  const totalSpeechTime = words.reduce((sum, w) => sum + w.duration, 0);
  const totalPauseTime = pauses.reduce((sum, p) => sum + p.duration, 0);
  const totalTime = totalSpeechTime + totalPauseTime;

  const pauseRatio = totalTime > 0 ? totalPauseTime / totalTime : 0;

  // Count pause types
  const longPauseCount = pauses.filter(p => p.type === 'long' || p.type === 'sigh').length;
  const mediumPauseCount = pauses.filter(p => p.type === 'medium').length;

  // Calculate confidence metrics
  const avgConfidence = words.reduce((sum, w) => sum + w.confidence, 0) / words.length;
  const lowConfidenceWords = words.filter(w => w.confidence < 0.7).length;

  // Calculate speech rate (WPM)
  const durationMinutes = totalTime / 60000;
  const speechRate = durationMinutes > 0 ? words.length / durationMinutes : 0;

  // Calculate duration variance
  const avgDuration = totalSpeechTime / words.length;
  const variance =
    words.reduce((sum, w) => sum + Math.pow(w.duration - avgDuration, 2), 0) / words.length;
  const durationVariance = Math.sqrt(variance) / avgDuration; // Coefficient of variation

  // Calculate overall hesitation score (0-1)
  let hesitationScore = 0;

  // Pause ratio contribution (high pause = hesitation)
  hesitationScore += Math.min(pauseRatio * 2, 0.3); // Up to 0.3

  // Long pauses contribution
  hesitationScore += Math.min(longPauseCount * 0.1, 0.25); // Up to 0.25

  // Medium pauses contribution
  hesitationScore += Math.min(mediumPauseCount * 0.05, 0.15); // Up to 0.15

  // Low confidence contribution
  const lowConfidenceRatio = lowConfidenceWords / words.length;
  hesitationScore += lowConfidenceRatio * 0.15; // Up to 0.15

  // Very slow speech contribution
  if (speechRate > 0 && speechRate < SPEED_THRESHOLDS.very_slow) {
    hesitationScore += 0.1;
  } else if (speechRate < SPEED_THRESHOLDS.slow) {
    hesitationScore += 0.05;
  }

  // High variance contribution (inconsistent speech)
  if (durationVariance > 0.8) {
    hesitationScore += 0.05;
  }

  return {
    pauseRatio,
    longPauseCount,
    mediumPauseCount,
    avgConfidence,
    lowConfidenceWords,
    speechRate,
    durationVariance,
    hesitationScore: Math.min(hesitationScore, 1),
  };
}

/**
 * Determine speech speed category
 */
export function categorizeSpeed(speechRate: number): TimingAnalysisResult['speedCategory'] {
  if (speechRate <= 0) return 'normal';
  if (speechRate < SPEED_THRESHOLDS.very_slow) return 'very_slow';
  if (speechRate < SPEED_THRESHOLDS.slow) return 'slow';
  if (speechRate < SPEED_THRESHOLDS.normal_high) return 'normal';
  if (speechRate < SPEED_THRESHOLDS.fast) return 'fast';
  return 'very_fast';
}

/**
 * Full timing analysis
 */
export function analyzeTimings(words: WordTiming[]): TimingAnalysisResult {
  const pauses = detectPauses(words);
  const hesitation = calculateHesitation(words);
  const speedCategory = categorizeSpeed(hesitation.speechRate);
  const confidenceIssues = hesitation.avgConfidence < 0.75 || hesitation.lowConfidenceWords > 2;

  return {
    pauses,
    hesitation,
    speedCategory,
    confidenceIssues,
  };
}

/**
 * Convert speech segment from realtime API format
 */
export function segmentFromRealtimeResult(result: {
  text: string;
  words?: Array<{
    word: string;
    start: number; // seconds
    end: number; // seconds
    confidence?: number;
  }>;
}): SpeechSegment | null {
  if (!result.words || result.words.length === 0) return null;

  const words: WordTiming[] = result.words.map(w => ({
    word: w.word,
    offset: w.start * 1000, // Convert to ms
    duration: (w.end - w.start) * 1000,
    confidence: w.confidence ?? 0.9,
  }));

  return {
    text: result.text,
    words,
    totalDuration: (result.words[result.words.length - 1].end - result.words[0].start) * 1000,
    startOffset: result.words[0].start * 1000,
  };
}
