/**
 * Mid-Stream Budget Tracker
 * F-13: Track tokens during streaming and interrupt if budget exceeded
 */

import { logger } from '@/lib/logger';

/**
 * Cost per token for budget tracking (GPT-4o-mini pricing)
 * $0.15/1M input + $0.60/1M output ≈ $0.002/1K average
 */
export const TOKEN_COST_PER_UNIT = 0.000002;

/**
 * Characters per token estimation (OpenAI averages ~4 chars/token for English)
 */
const CHARS_PER_TOKEN_ESTIMATE = 4;

/**
 * Safety margin for budget enforcement (stop at 95% of remaining budget)
 */
const BUDGET_SAFETY_MARGIN = 0.95;

/**
 * Estimate tokens from text content
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

/**
 * Mid-stream budget tracker for F-13 compliance
 * Tracks estimated token usage during streaming and signals when budget exceeded
 */
export class MidStreamBudgetTracker {
  private estimatedTokens = 0;
  private readonly maxTokens: number;
  private readonly userId: string;

  constructor(budgetLimit: number, totalSpent: number, userId: string) {
    // Calculate max tokens we can afford (with safety margin)
    const remainingBudget = (budgetLimit - totalSpent) * BUDGET_SAFETY_MARGIN;
    this.maxTokens = Math.floor(remainingBudget / TOKEN_COST_PER_UNIT);
    this.userId = userId;
  }

  /**
   * Track content chunk and check if budget exceeded
   * @returns true if budget exceeded and stream should be aborted
   */
  trackChunk(content: string): boolean {
    const chunkTokens = estimateTokens(content);
    this.estimatedTokens += chunkTokens;

    if (this.estimatedTokens >= this.maxTokens) {
      logger.warn('Mid-stream budget limit reached', {
        userId: this.userId,
        estimatedTokens: this.estimatedTokens,
        maxTokens: this.maxTokens,
      });
      return true;
    }
    return false;
  }

  /**
   * Get estimated tokens used so far
   */
  getEstimatedTokens(): number {
    return this.estimatedTokens;
  }

  /**
   * Get estimated cost based on tracked tokens
   */
  getEstimatedCost(): number {
    return this.estimatedTokens * TOKEN_COST_PER_UNIT;
  }
}
