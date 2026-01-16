/**
 * Jailbreak Flagging Service
 * Part of Ethical Design Hardening (F-15)
 *
 * Flags novel jailbreak attempts for manual review.
 * Learns from patterns to improve detection over time.
 */

import { logger } from '@/lib/logger';
import { JailbreakAttempt } from './types';

const log = logger.child({ module: 'jailbreak-flagging' });

/**
 * Known jailbreak patterns (baseline)
 */
const KNOWN_PATTERNS = new Set([
  'ignore_instructions',
  'roleplay_bypass',
  'language_switch',
  'encoding_obfuscation',
  'system_prompt_extraction',
  'repeat_bypass',
  'hypothetical_scenario',
  'developer_mode',
]);

/**
 * Storage for flagged attempts
 */
const flaggedAttempts: Map<string, JailbreakAttempt> = new Map();
const contentHashes: Set<string> = new Set();

/**
 * Flag a potential jailbreak attempt
 */
export function flagJailbreakAttempt(
  userId: string,
  sessionId: string,
  content: string,
  detectedPattern: string,
  confidence: number
): JailbreakAttempt {
  const contentHash = hashContent(content);
  const isNovel = !KNOWN_PATTERNS.has(detectedPattern);
  const isDuplicate = contentHashes.has(contentHash);

  // Create attempt record
  const attempt: JailbreakAttempt = {
    id: generateAttemptId(),
    anonymizedUserId: anonymizeId(userId),
    sessionHash: hashSessionId(sessionId),
    timestamp: new Date(),
    patternType: detectedPattern,
    confidence,
    isNovel,
    contentHash,
    reviewStatus: isDuplicate ? 'reviewed' : 'pending',
    sanitizedSample: isNovel ? sanitizeContent(content) : undefined,
  };

  // Store if not duplicate
  if (!isDuplicate) {
    flaggedAttempts.set(attempt.id, attempt);
    contentHashes.add(contentHash);
  }

  log.info('Jailbreak attempt flagged', {
    attemptId: attempt.id,
    patternType: detectedPattern,
    confidence,
    isNovel,
    isDuplicate,
  });

  return attempt;
}

/**
 * Get pending attempts for manual review
 */
export function getPendingReviews(options: {
  novelOnly?: boolean;
  minConfidence?: number;
  limit?: number;
}): JailbreakAttempt[] {
  let attempts = Array.from(flaggedAttempts.values()).filter(
    (a) => a.reviewStatus === 'pending'
  );

  if (options.novelOnly) {
    attempts = attempts.filter((a) => a.isNovel);
  }

  if (options.minConfidence !== undefined) {
    attempts = attempts.filter((a) => a.confidence >= options.minConfidence!);
  }

  // Sort by confidence desc, then novel first
  attempts.sort((a, b) => {
    if (a.isNovel !== b.isNovel) return a.isNovel ? -1 : 1;
    return b.confidence - a.confidence;
  });

  if (options.limit) {
    attempts = attempts.slice(0, options.limit);
  }

  return attempts;
}

/**
 * Mark attempt as reviewed
 */
export function markReviewed(
  attemptId: string,
  status: 'false_positive' | 'confirmed',
  addToKnownPatterns: boolean = false
): void {
  const attempt = flaggedAttempts.get(attemptId);
  if (!attempt) {
    log.warn('Attempt not found for review', { attemptId });
    return;
  }

  attempt.reviewStatus = status;

  // Learn from confirmed patterns
  if (status === 'confirmed' && addToKnownPatterns && attempt.isNovel) {
    KNOWN_PATTERNS.add(attempt.patternType);
    log.info('Added new pattern to known patterns', {
      pattern: attempt.patternType,
    });
  }

  log.info('Jailbreak attempt reviewed', {
    attemptId,
    status,
    patternType: attempt.patternType,
    addedToKnown: addToKnownPatterns,
  });
}

/**
 * Get statistics on flagged attempts
 */
export function getJailbreakStatistics(periodDays: number = 30): {
  totalAttempts: number;
  novelAttempts: number;
  pendingReview: number;
  confirmedThreats: number;
  falsePositives: number;
  topPatterns: Array<{ pattern: string; count: number }>;
} {
  const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const recentAttempts = Array.from(flaggedAttempts.values()).filter(
    (a) => a.timestamp >= cutoff
  );

  const patternCounts: Record<string, number> = {};
  for (const attempt of recentAttempts) {
    patternCounts[attempt.patternType] =
      (patternCounts[attempt.patternType] || 0) + 1;
  }

  const topPatterns = Object.entries(patternCounts)
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalAttempts: recentAttempts.length,
    novelAttempts: recentAttempts.filter((a) => a.isNovel).length,
    pendingReview: recentAttempts.filter((a) => a.reviewStatus === 'pending').length,
    confirmedThreats: recentAttempts.filter((a) => a.reviewStatus === 'confirmed').length,
    falsePositives: recentAttempts.filter((a) => a.reviewStatus === 'false_positive').length,
    topPatterns,
  };
}

/**
 * Check if pattern is known
 */
export function isKnownPattern(pattern: string): boolean {
  return KNOWN_PATTERNS.has(pattern);
}

/**
 * Get all known patterns (for testing/debugging)
 */
export function getKnownPatterns(): string[] {
  return Array.from(KNOWN_PATTERNS);
}

// Helper functions
function generateAttemptId(): string {
  return `jb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function anonymizeId(id: string): string {
  return id.slice(0, 8) + '***';
}

function hashSessionId(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    const char = sessionId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `sess_${Math.abs(hash).toString(16)}`;
}

function hashContent(content: string): string {
  // Simple hash for deduplication
  let hash = 0;
  const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `content_${Math.abs(hash).toString(16)}`;
}

function sanitizeContent(content: string): string {
  // Remove any potential PII, keep first 100 chars
  return content
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, '[EMAIL]')
    .replace(/\b(?:\+39\s?)?(?:0[0-9]{1,4}[-\s]?)?[0-9]{6,10}\b/g, '[PHONE]')
    .replace(/\b[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]\b/gi, '[CF]')
    .slice(0, 100)
    + (content.length > 100 ? '...' : '');
}
