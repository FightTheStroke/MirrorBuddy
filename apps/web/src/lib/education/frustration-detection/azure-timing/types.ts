/**
 * Types for Azure Speech timing analysis
 */

export interface WordTiming {
  word: string;
  offset: number; // milliseconds from start
  duration: number; // milliseconds
  confidence: number; // 0-1
}

export interface SpeechSegment {
  text: string;
  words: WordTiming[];
  totalDuration: number;
  startOffset: number;
}

export interface PauseInfo {
  /** Duration in milliseconds */
  duration: number;
  /** Position in the speech (after which word index) */
  afterWordIndex: number;
  /** Type of pause */
  type: 'micro' | 'short' | 'medium' | 'long' | 'sigh';
}

export interface HesitationIndicators {
  /** Total pause time / speech time ratio */
  pauseRatio: number;
  /** Number of long pauses (>1.5s) */
  longPauseCount: number;
  /** Number of medium pauses (0.5-1.5s) */
  mediumPauseCount: number;
  /** Average confidence score */
  avgConfidence: number;
  /** Words with low confidence (<0.7) */
  lowConfidenceWords: number;
  /** Speech rate (words per minute) */
  speechRate: number;
  /** Variance in word duration (high = inconsistent) */
  durationVariance: number;
  /** Overall hesitation score (0-1) */
  hesitationScore: number;
}

export interface TimingAnalysisResult {
  /** Raw pause information */
  pauses: PauseInfo[];
  /** Aggregated hesitation indicators */
  hesitation: HesitationIndicators;
  /** Detected speech rate category */
  speedCategory: 'very_slow' | 'slow' | 'normal' | 'fast' | 'very_fast';
  /** Confidence issues detected */
  confidenceIssues: boolean;
}
