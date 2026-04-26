/**
 * Jailbreak Detection Utilities
 * Helper functions for encoding detection and scoring
 *
 * Related: #30 Safety Guardrails Issue, S-04 Task
 */

/**
 * Check for encoding attempts (Base64, rot13, etc.)
 */
export function detectEncoding(text: string): { detected: boolean; type?: string } {
  // Base64 detection (min 20 chars, valid charset)
  const base64Pattern = /[A-Za-z0-9+/=]{20,}/g;
  const base64Matches = text.match(base64Pattern);
  if (base64Matches) {
    for (const match of base64Matches) {
      try {
        const decoded = atob(match);
        // Check if decoded content contains suspicious patterns
        if (/ignore|pretend|jailbreak|system\s*prompt/i.test(decoded)) {
          return { detected: true, type: 'base64' };
        }
      } catch {
        // Invalid base64, ignore
      }
    }
  }

  // Leetspeak detection (e.g., "1gn0r3 1nstruct10ns")
  const leetspeak = text
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/0/g, 'o')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a');

  if (leetspeak !== text) {
    // Re-check with decoded leetspeak
    const suspiciousPatterns = /ignor[ea]|pretend|jailbreak|system\s*prompt/i;
    if (suspiciousPatterns.test(leetspeak) && !suspiciousPatterns.test(text)) {
      return { detected: true, type: 'leetspeak' };
    }
  }

  // Unicode homograph detection (e.g., using Cyrillic 'а' instead of Latin 'a')
  const hasNonASCII = /[^\x00-\x7F]/.test(text);
  const hasSuspiciousHomographs = /[аеорсух]/i.test(text); // Common Cyrillic lookalikes
  if (hasNonASCII && hasSuspiciousHomographs) {
    return { detected: true, type: 'homograph' };
  }

  return { detected: false };
}

/**
 * Calculate threat score from pattern matches
 */
export function calculateThreatScore(
  text: string,
  patterns: Array<{ pattern: RegExp; weight: number }>
): { score: number; matched: string[] } {
  let totalScore = 0;
  const matched: string[] = [];

  for (const { pattern, weight } of patterns) {
    const match = text.match(pattern);
    if (match) {
      totalScore += weight;
      matched.push(match[0]);
    }
    pattern.lastIndex = 0;
  }

  return { score: Math.min(totalScore, 1), matched };
}
