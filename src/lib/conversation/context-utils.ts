/**
 * Context Utilities - Token Estimation and Formatting
 *
 * Helper functions for context building:
 * - Token estimation
 * - Context truncation
 */

import { logger } from "@/lib/logger";

/**
 * Estimate token count using simple approximation.
 *
 * Uses rough estimation: tokens ≈ characters / 4
 * This is a simplified estimate; actual token count depends on tokenizer.
 *
 * @param text Text to estimate
 * @returns Estimated token count
 */
export function estimateContextTokens(text: string): number {
  // Simple approximation: average token length is ~4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Truncate context to fit within token limit.
 *
 * If context exceeds token limit, progressively removes:
 * 1. Cross-maestro learnings
 * 2. Hierarchical summaries
 * 3. Topics
 * 4. Then truncates recent summary
 *
 * @param context Combined context string
 * @param maxTokens Maximum tokens allowed
 * @returns Truncated context
 */
export function truncateContext(context: string, maxTokens: number): string {
  const estimatedTokens = estimateContextTokens(context);

  if (estimatedTokens <= maxTokens) {
    return context;
  }

  logger.warn("Context truncation needed", {
    estimatedTokens,
    maxTokens,
    excess: estimatedTokens - maxTokens,
  });

  // Try removing cross-maestro learnings section first
  let truncated = context.replace(
    /## Apprendimenti da Altri Maestri\n[\s\S]*?(?=\n##|$)/g,
    "",
  );

  if (estimateContextTokens(truncated) <= maxTokens) {
    return truncated.trim();
  }

  // Remove hierarchical summaries
  truncated = truncated
    .replace(/## Riepilogo Settimanale\n[\s\S]*?(?=\n##|$)/g, "")
    .replace(/## Riepilogo Mensile\n[\s\S]*?(?=\n##|$)/g, "");

  if (estimateContextTokens(truncated) <= maxTokens) {
    return truncated.trim();
  }

  // Remove topics section
  truncated = truncated.replace(
    /## Argomenti Affrontati\n[\s\S]*?(?=\n##|$)/g,
    "",
  );

  if (estimateContextTokens(truncated) <= maxTokens) {
    return truncated.trim();
  }

  // Last resort: truncate recent summary
  const recent = truncated.match(/## Contesto Recente\n([\s\S]*?)(?=\n##|$)/);
  if (recent) {
    const maxCharsForSummary = maxTokens * 4 * 0.7;
    let summary = recent[1];
    if (summary.length > maxCharsForSummary) {
      summary = summary.substring(0, Math.floor(maxCharsForSummary)) + "...";
    }
    truncated = truncated.replace(
      /## Contesto Recente\n[\s\S]*?(?=\n##|$)/,
      `## Contesto Recente\n${summary}`,
    );
  }

  return truncated.trim();
}
