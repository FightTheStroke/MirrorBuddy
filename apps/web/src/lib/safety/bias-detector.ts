/**
 * Bias Detector Module
 * EU AI Act Art. 10 Compliance — Educational Software for Minors
 *
 * Detects bias in AI-generated responses and knowledge base content.
 * Categories: gender, racial/ethnic, age, disability, socioeconomic,
 * cultural, and educational ability bias.
 *
 * Referenced by: ADR 0004, ADR 0115, ADR 0062, ADR 0136
 * Regulatory: EU AI Act 2024/1689 Art. 10, Italian L.132/2025
 */

import { logger } from '@/lib/logger';
import { BIAS_PATTERNS } from './bias-detector-patterns';

const log = logger.child({ module: 'bias-detector' });

// ============================================================================
// TYPES
// ============================================================================

export type BiasCategory =
  | 'gender'
  | 'racial_ethnic'
  | 'age'
  | 'disability'
  | 'socioeconomic'
  | 'cultural'
  | 'educational_ability';

export type BiasSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface BiasDetection {
  /** Whether bias was detected */
  detected: boolean;
  /** Category of bias found */
  category: BiasCategory;
  /** Severity level */
  severity: BiasSeverity;
  /** The matched pattern or phrase */
  match: string;
  /** Explanation for the detection */
  reason: string;
  /** Suggested alternative phrasing */
  suggestion: string;
}

export interface BiasAnalysisResult {
  /** Whether any bias was detected */
  hasBias: boolean;
  /** Overall bias risk score (0-100, lower = less bias) */
  riskScore: number;
  /** Individual detections */
  detections: BiasDetection[];
  /** Content was safe for educational use */
  safeForEducation: boolean;
  /** Analysis metadata */
  analyzedLength: number;
}

// ============================================================================
// CORE API
// ============================================================================

/**
 * Analyze text for bias. Main entry point.
 * Used for both AI response validation and knowledge base auditing.
 */
export function detectBias(text: string): BiasAnalysisResult {
  if (!text || text.trim().length === 0) {
    return {
      hasBias: false,
      riskScore: 0,
      detections: [],
      safeForEducation: true,
      analyzedLength: 0,
    };
  }

  const detections: BiasDetection[] = [];

  for (const bp of BIAS_PATTERNS) {
    // Reset regex state for global patterns
    bp.pattern.lastIndex = 0;
    const matches = text.match(bp.pattern);
    if (matches) {
      for (const match of matches) {
        detections.push({
          detected: true,
          category: bp.category,
          severity: bp.severity,
          match: match.slice(0, 80),
          reason: bp.reason,
          suggestion: bp.suggestion,
        });
      }
    }
  }

  const riskScore = calculateRiskScore(detections);
  const hasBias = detections.length > 0;
  const hasCritical = detections.some((d) => d.severity === 'critical');
  const hasHigh = detections.some((d) => d.severity === 'high');

  const result: BiasAnalysisResult = {
    hasBias,
    riskScore,
    detections,
    safeForEducation: !hasCritical && !hasHigh,
    analyzedLength: text.length,
  };

  if (hasBias) {
    log.warn('Bias detected in content', {
      riskScore,
      categories: [...new Set(detections.map((d) => d.category))],
      count: detections.length,
      safe: result.safeForEducation,
    });
  }

  return result;
}

/**
 * Quick check: is this text safe from bias for educational use?
 * Returns true if no high/critical bias detected.
 */
export function isSafeFromBias(text: string): boolean {
  return detectBias(text).safeForEducation;
}

/**
 * Get bias categories found in text (for logging/audit).
 */
export function getBiasCategories(text: string): BiasCategory[] {
  const result = detectBias(text);
  return [...new Set(result.detections.map((d) => d.category))];
}

// ============================================================================
// SCORING
// ============================================================================

function calculateRiskScore(detections: BiasDetection[]): number {
  if (detections.length === 0) return 0;

  let score = 0;
  for (const d of detections) {
    switch (d.severity) {
      case 'critical':
        score += 30;
        break;
      case 'high':
        score += 15;
        break;
      case 'medium':
        score += 7;
        break;
      case 'low':
        score += 3;
        break;
    }
  }

  return Math.min(100, score);
}
