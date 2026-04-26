/**
 * Unified Frustration Classifier
 * Combines all three phases for comprehensive frustration detection
 */

import { FrustrationTracker, type FrustrationState } from './tracker';
import { analyzeTimings, type WordTiming, type TimingAnalysisResult } from './azure-timing';
import { analyzeProsody, type ProsodyResult } from './prosody';
import type { SupportedLocale } from './patterns';

export interface ClassifierInput {
  /** Transcribed text from speech */
  text?: string;
  /** Word timings from Azure Speech */
  wordTimings?: WordTiming[];
  /** Raw audio samples for prosody analysis */
  audioSamples?: Float32Array;
  /** Audio sample rate */
  sampleRate?: number;
}

export interface ClassifierResult {
  /** Overall frustration score (0-1) */
  frustrationScore: number;
  /** Confidence in the classification (0-1) */
  confidence: number;
  /** Should we intervene? */
  shouldIntervene: boolean;
  /** Suggested intervention type */
  interventionType: 'none' | 'encourage' | 'simplify' | 'break' | 'help';
  /** Human-readable reason */
  reason: string;
  /** Detailed breakdown by source */
  breakdown: {
    textPattern: number;
    hesitation: number;
    prosody: number;
    trend: number;
  };
  /** Raw results from each phase */
  rawResults: {
    text?: FrustrationState;
    timing?: TimingAnalysisResult;
    prosody?: ProsodyResult;
  };
}

export interface ClassifierConfig {
  /** Locale for text pattern detection */
  locale?: SupportedLocale;
  /** Threshold for intervention (default: 0.6) */
  interventionThreshold: number;
  /** Weight for text patterns (default: 0.4) */
  textWeight: number;
  /** Weight for timing analysis (default: 0.3) */
  timingWeight: number;
  /** Weight for prosody analysis (default: 0.3) */
  prosodyWeight: number;
}

const DEFAULT_CONFIG: ClassifierConfig = {
  interventionThreshold: 0.6,
  textWeight: 0.4,
  timingWeight: 0.3,
  prosodyWeight: 0.3,
};

export class FrustrationClassifier {
  private tracker: FrustrationTracker;
  private config: ClassifierConfig;
  private recentScores: number[] = [];
  private readonly maxHistory = 10;

  constructor(config: Partial<ClassifierConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tracker = new FrustrationTracker(this.config.locale);
  }

  /**
   * Classify frustration from available inputs
   */
  classify(input: ClassifierInput): ClassifierResult {
    const breakdown = {
      textPattern: 0,
      hesitation: 0,
      prosody: 0,
      trend: 0,
    };

    const rawResults: ClassifierResult['rawResults'] = {};
    let totalWeight = 0;
    let weightedScore = 0;

    // Phase 1: Text pattern analysis
    if (input.text) {
      const textResult = this.tracker.analyze(input.text);
      rawResults.text = textResult;
      breakdown.textPattern = textResult.overall;
      weightedScore += textResult.overall * this.config.textWeight;
      totalWeight += this.config.textWeight;

      // Add trend penalty
      if (textResult.trend === 'declining') {
        breakdown.trend = 0.1;
        weightedScore += 0.1 * this.config.textWeight;
      }
    }

    // Phase 2: Timing analysis
    if (input.wordTimings && input.wordTimings.length > 0) {
      const timingResult = analyzeTimings(input.wordTimings);
      rawResults.timing = timingResult;
      breakdown.hesitation = timingResult.hesitation.hesitationScore;
      weightedScore += timingResult.hesitation.hesitationScore * this.config.timingWeight;
      totalWeight += this.config.timingWeight;
    }

    // Phase 3: Prosody analysis
    if (input.audioSamples && input.audioSamples.length > 0) {
      const prosodyResult = analyzeProsody(input.audioSamples, {
        sampleRate: input.sampleRate,
      });
      rawResults.prosody = prosodyResult;
      breakdown.prosody = prosodyResult.emotions.frustration;
      weightedScore += prosodyResult.emotions.frustration * this.config.prosodyWeight;
      totalWeight += this.config.prosodyWeight;
    }

    // Calculate final score
    const frustrationScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

    // Update history for trend
    this.recentScores.push(frustrationScore);
    if (this.recentScores.length > this.maxHistory) {
      this.recentScores.shift();
    }

    // Determine intervention
    const { shouldIntervene, interventionType, reason } = this.determineIntervention(
      frustrationScore,
      breakdown,
      rawResults
    );

    // Calculate confidence based on available data
    let confidence = 0;
    if (input.text) confidence += 0.4;
    if (input.wordTimings && input.wordTimings.length > 3) confidence += 0.3;
    if (rawResults.prosody?.voiceDetected) confidence += 0.3;

    return {
      frustrationScore,
      confidence: Math.min(1, confidence),
      shouldIntervene,
      interventionType,
      reason,
      breakdown,
      rawResults,
    };
  }

  private determineIntervention(
    score: number,
    breakdown: ClassifierResult['breakdown'],
    raw: ClassifierResult['rawResults']
  ): {
    shouldIntervene: boolean;
    interventionType: ClassifierResult['interventionType'];
    reason: string;
  } {
    if (score < this.config.interventionThreshold) {
      return {
        shouldIntervene: false,
        interventionType: 'none',
        reason: '',
      };
    }

    // Determine type based on breakdown
    if (breakdown.textPattern > 0.8) {
      return {
        shouldIntervene: true,
        interventionType: 'help',
        reason: 'Explicit frustration detected in speech',
      };
    }

    if (breakdown.hesitation > 0.7) {
      return {
        shouldIntervene: true,
        interventionType: 'simplify',
        reason: 'Significant hesitation and pauses detected',
      };
    }

    if (breakdown.prosody > 0.7) {
      return {
        shouldIntervene: true,
        interventionType: 'break',
        reason: 'Voice stress indicators elevated',
      };
    }

    if (raw.text?.repeatMultiplier && raw.text.repeatMultiplier > 1.5) {
      return {
        shouldIntervene: true,
        interventionType: 'simplify',
        reason: 'Repeated similar questions detected',
      };
    }

    if (breakdown.trend > 0) {
      return {
        shouldIntervene: true,
        interventionType: 'encourage',
        reason: 'Frustration trend increasing',
      };
    }

    return {
      shouldIntervene: true,
      interventionType: 'encourage',
      reason: 'Multiple frustration indicators detected',
    };
  }

  /**
   * Get frustration trend over recent interactions
   */
  getTrend(): 'improving' | 'stable' | 'declining' {
    if (this.recentScores.length < 3) return 'stable';

    const midpoint = Math.floor(this.recentScores.length / 2);
    const firstHalf = this.recentScores.slice(0, midpoint);
    const secondHalf = this.recentScores.slice(midpoint);

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = avgSecond - avgFirst;
    if (diff > 0.15) return 'declining';
    if (diff < -0.15) return 'improving';
    return 'stable';
  }

  /**
   * Reset classifier state
   */
  reset(): void {
    this.tracker.reset();
    this.recentScores = [];
  }

  /**
   * Set locale for text pattern detection
   */
  setLocale(locale: SupportedLocale): void {
    this.config.locale = locale;
    this.tracker.setLocale(locale);
  }
}

// Factory function for easy instantiation
export function createClassifier(config?: Partial<ClassifierConfig>): FrustrationClassifier {
  return new FrustrationClassifier(config);
}
