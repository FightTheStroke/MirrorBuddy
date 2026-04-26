/**
 * Learnings Injector with Time-Based Exponential Decay
 *
 * Injects relevant learnings into conversation prompts with decay scoring
 * to prioritize recent insights while gradually deprioritizing older ones.
 *
 * ADR-related: Knowledge retention in conversation context
 */

export interface DecayConfig {
  /** Half-life in days for exponential decay (default: 30) */
  halflifeDays: number;
  /** Minimum score threshold to include learning (default: 0.1) */
  minThreshold: number;
  /** Maximum number of learnings to return (default: 10) */
  maxLearnings: number;
}

export interface WeightedLearning {
  /** Learning content/text */
  content: string;
  /** Decay-weighted score [0, 1] */
  score: number;
  /** Age in days */
  ageDays: number;
}

export interface LearningEntry {
  content: string;
  createdAt: Date;
}

const DEFAULT_CONFIG: DecayConfig = {
  halflifeDays: 30,
  minThreshold: 0.1,
  maxLearnings: 10,
};

/**
 * Injects learnings with exponential time-based decay
 *
 * Applies formula: score = exp(-ageDays / halflifeDays)
 * - Recent learnings: score ≈ 1
 * - At halflife: score ≈ 0.368
 * - Stale learnings: score → 0
 *
 * @param learnings Array of learning entries with creation dates
 * @param config Decay configuration (optional)
 * @returns Sorted weighted learnings above threshold
 */
export function injectLearningsWithDecay(
  learnings: LearningEntry[],
  config: Partial<DecayConfig> = {},
): WeightedLearning[] {
  const finalConfig: DecayConfig = { ...DEFAULT_CONFIG, ...config };
  const now = new Date();

  // Calculate weighted scores
  const weighted = learnings
    .map((learning) => {
      const ageDays =
        (now.getTime() - learning.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const score = Math.exp(-ageDays / finalConfig.halflifeDays);

      return {
        content: learning.content,
        score,
        ageDays: Math.round(ageDays),
      };
    })
    // Filter below threshold
    .filter((item) => item.score >= finalConfig.minThreshold)
    // Sort by score descending (highest first)
    .sort((a, b) => b.score - a.score)
    // Limit to maxLearnings
    .slice(0, finalConfig.maxLearnings);

  return weighted;
}

/**
 * Formats weighted learnings as Italian markdown section
 *
 * Adds decay indicators:
 * - 🟢 (0.8+): Recent/fresh
 * - 🟡 (0.3-0.8): Medium age
 * - 🔴 (<0.3): Stale/fading
 *
 * @param learnings Weighted learnings to format
 * @returns Markdown-formatted section or empty string if no learnings
 */
export function formatLearningsSection(learnings: WeightedLearning[]): string {
  if (learnings.length === 0) {
    return "";
  }

  const lines: string[] = ["## Nozioni Apprese", ""];

  for (const learning of learnings) {
    // Select indicator based on score
    let indicator = "🔴"; // stale
    if (learning.score >= 0.8) {
      indicator = "🟢"; // recent
    } else if (learning.score >= 0.3) {
      indicator = "🟡"; // medium
    }

    // Format age (plural handling)
    const dayLabel = learning.ageDays === 1 ? "giorno" : "giorni";

    lines.push(
      `${indicator} ${learning.content} _(${learning.ageDays} ${dayLabel} fa)_`,
    );
  }

  lines.push("");
  return lines.join("\n");
}
