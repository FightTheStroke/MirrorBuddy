/**
 * Conversation tracking for frustration detection
 * - Repeated attempts detection
 * - Sentiment trend analysis
 */

import { analyzeText, countFillers, type SupportedLocale, type TextAnalysisResult } from './patterns';

// Common stopwords to ignore when comparing questions
const STOPWORDS = new Set([
  'il', 'la', 'lo', 'i', 'gli', 'le', 'un', 'una', 'uno', 'che', 'di', 'da', 'per', 'si',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'do', 'can', 'you', 'i',
  'el', 'la', 'los', 'las', 'un', 'una', 'que', 'de', 'por',
  'le', 'la', 'les', 'un', 'une', 'de', 'du', 'des',
  'der', 'die', 'das', 'ein', 'eine', 'zu', 'ich',
]);

// Extract key words from text for comparison
function extractKeyWords(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\sà-ÿ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalized.split(' ').filter(w => !STOPWORDS.has(w) && w.length > 2);

  // Apply simple stemming: remove common suffixes
  const stemmed = words.map(w => {
    // Italian verb endings
    if (w.endsWith('are') || w.endsWith('ere') || w.endsWith('ire')) return w.slice(0, -3);
    if (w.endsWith('ando') || w.endsWith('endo')) return w.slice(0, -4);
    if (w.endsWith('ato') || w.endsWith('ito') || w.endsWith('uto')) return w.slice(0, -3);
    // English -ing, -ed, -s
    if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
    if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
    // Keep first 5 chars to catch different conjugations (risolv, capiv, etc.)
    return w.length > 5 ? w.slice(0, 5) : w;
  });

  return new Set(stemmed);
}

// Calculate similarity between two sets of words (Jaccard-like)
function wordSetSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }

  const union = a.size + b.size - intersection;
  return intersection / union;
}

export interface RepeatedAttempt {
  id: string; // Unique identifier for this cluster
  keyWords: Set<string>; // Representative key words
  count: number;
  firstAt: number;
  lastAt: number;
  texts: string[];
}

export interface TrendEntry {
  timestamp: number;
  frustrationScore: number;
  repeatScore: number;
  confusionScore: number;
}

export interface FrustrationState {
  /** Combined frustration score (0-1) from all signals */
  overall: number;
  /** Text pattern analysis result */
  textAnalysis: TextAnalysisResult;
  /** Repeated attempts multiplier (1 = no repeat, up to 2 = many repeats) */
  repeatMultiplier: number;
  /** Trend direction */
  trend: 'improving' | 'stable' | 'declining';
  /** Number of filler words detected */
  fillerCount: number;
  /** Detailed breakdown */
  breakdown: {
    textPatterns: number;
    repeatedAttempts: number;
    trendPenalty: number;
    fillerPenalty: number;
  };
}

export class FrustrationTracker {
  private repeatedAttempts: Map<string, RepeatedAttempt> = new Map();
  private trendHistory: TrendEntry[] = [];
  private locale: SupportedLocale | undefined;

  // Configuration
  private readonly repeatThreshold = 3; // After 3 similar questions, add frustration
  private readonly repeatWindow = 5 * 60 * 1000; // 5 minutes
  private readonly trendWindow = 10; // Last 10 interactions
  private readonly maxHistorySize = 50;

  constructor(locale?: SupportedLocale) {
    this.locale = locale;
  }

  setLocale(locale: SupportedLocale): void {
    this.locale = locale;
  }

  /**
   * Process new user input and return frustration state
   */
  analyze(text: string): FrustrationState {
    const now = Date.now();

    // 1. Text pattern analysis
    const textAnalysis = analyzeText(text, this.locale);

    // Update locale if detected
    if (textAnalysis.detectedLocale && !this.locale) {
      this.locale = textAnalysis.detectedLocale;
    }

    // 2. Check for repeated attempts
    const repeatMultiplier = this.trackRepeatedAttempt(text, now);

    // 3. Update trend history
    this.trendHistory.push({
      timestamp: now,
      frustrationScore: textAnalysis.frustrationScore,
      repeatScore: textAnalysis.repeatRequestScore,
      confusionScore: textAnalysis.confusionScore,
    });

    // Trim history
    if (this.trendHistory.length > this.maxHistorySize) {
      this.trendHistory = this.trendHistory.slice(-this.maxHistorySize);
    }

    // 4. Calculate trend
    const trend = this.calculateTrend();

    // 5. Count fillers
    const fillerCount = countFillers(text, this.locale);

    // 6. Calculate overall score
    const breakdown = {
      textPatterns: Math.max(
        textAnalysis.frustrationScore,
        textAnalysis.repeatRequestScore * 0.7,
        textAnalysis.confusionScore * 0.5
      ),
      repeatedAttempts: (repeatMultiplier - 1) * 0.3, // 0 to 0.3
      trendPenalty: trend === 'declining' ? 0.1 : 0,
      fillerPenalty: Math.min(fillerCount * 0.05, 0.15), // Up to 0.15
    };

    const overall = Math.min(
      1,
      breakdown.textPatterns +
        breakdown.repeatedAttempts +
        breakdown.trendPenalty +
        breakdown.fillerPenalty
    );

    return {
      overall,
      textAnalysis,
      repeatMultiplier,
      trend,
      fillerCount,
      breakdown,
    };
  }

  private trackRepeatedAttempt(text: string, now: number): number {
    const keyWords = extractKeyWords(text);
    if (keyWords.size === 0) return 1;

    // Find the best matching existing cluster
    let bestMatch: RepeatedAttempt | null = null;
    let bestSimilarity = 0;
    const SIMILARITY_THRESHOLD = 0.4; // 40% word overlap required

    for (const attempt of this.repeatedAttempts.values()) {
      // Check if within time window
      if (now - attempt.lastAt >= this.repeatWindow) continue;

      const similarity = wordSetSimilarity(keyWords, attempt.keyWords);
      if (similarity > bestSimilarity && similarity >= SIMILARITY_THRESHOLD) {
        bestSimilarity = similarity;
        bestMatch = attempt;
      }
    }

    if (bestMatch) {
      // Update existing cluster
      bestMatch.count++;
      bestMatch.lastAt = now;
      bestMatch.texts.push(text);
      // Merge key words for better future matching
      for (const word of keyWords) {
        bestMatch.keyWords.add(word);
      }

      // Cap at 5 for multiplier calculation
      const effectiveCount = Math.min(bestMatch.count, 5);
      return 1 + (effectiveCount - 1) * 0.25; // 1.0, 1.25, 1.5, 1.75, 2.0
    } else {
      // Create new cluster
      const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
      this.repeatedAttempts.set(id, {
        id,
        keyWords,
        count: 1,
        firstAt: now,
        lastAt: now,
        texts: [text],
      });
      return 1;
    }
  }

  private calculateTrend(): 'improving' | 'stable' | 'declining' {
    if (this.trendHistory.length < 3) return 'stable';

    const recent = this.trendHistory.slice(-this.trendWindow);
    const midpoint = Math.floor(recent.length / 2);

    const firstHalf = recent.slice(0, midpoint);
    const secondHalf = recent.slice(midpoint);

    const avgFirst = this.averageFrustration(firstHalf);
    const avgSecond = this.averageFrustration(secondHalf);

    const diff = avgSecond - avgFirst;

    if (diff > 0.15) return 'declining';
    if (diff < -0.15) return 'improving';
    return 'stable';
  }

  private averageFrustration(entries: TrendEntry[]): number {
    if (entries.length === 0) return 0;
    const sum = entries.reduce(
      (acc, e) => acc + e.frustrationScore + e.repeatScore * 0.5,
      0
    );
    return sum / entries.length;
  }

  /**
   * Get repeated attempts that might indicate frustration
   */
  getRepeatedAttempts(minCount = 2): RepeatedAttempt[] {
    return Array.from(this.repeatedAttempts.values())
      .filter(a => a.count >= minCount)
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Reset tracker state
   */
  reset(): void {
    this.repeatedAttempts.clear();
    this.trendHistory = [];
  }

  /**
   * Clean up old entries
   */
  cleanup(maxAge = 30 * 60 * 1000): void {
    const now = Date.now();

    // Clean old repeated attempts
    for (const [hash, attempt] of this.repeatedAttempts) {
      if (now - attempt.lastAt > maxAge) {
        this.repeatedAttempts.delete(hash);
      }
    }

    // Clean old trend entries
    this.trendHistory = this.trendHistory.filter(e => now - e.timestamp < maxAge);
  }
}

// Singleton for global tracking
let globalTracker: FrustrationTracker | null = null;

export function getGlobalTracker(): FrustrationTracker {
  if (!globalTracker) {
    globalTracker = new FrustrationTracker();
  }
  return globalTracker;
}

export function resetGlobalTracker(): void {
  globalTracker = null;
}
