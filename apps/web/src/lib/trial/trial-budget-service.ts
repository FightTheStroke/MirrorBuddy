/**
 * Trial Budget Service
 *
 * Manages trial API cost budget and triggers admin count updates
 * when budget changes occur (F-06: trial budget push).
 *
 * Wraps budget-cap functions and adds publish triggers.
 *
 * INTEGRATION STATUS:
 * - [x] /api/chat: Integrated - increments on trial user chat completion
 * - [ ] /api/chat/stream: Ready for integration (streaming endpoint)
 * - [ ] /api/trial/voice: Ready for integration (voice endpoint)
 *
 * See INTEGRATION-GUIDE.md for usage examples.
 */

import {
  getMonthlyBudget,
  incrementBudget,
  isBudgetExhausted,
  getRemainingBudget,
  type MonthlyBudgetData,
} from "./budget-cap";
import { calculateAndPublishAdminCounts } from "@/lib/admin/calculate-and-publish-admin-counts";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "trial-budget-service" });

/**
 * Increment trial budget and publish admin counts update
 * Called when trial users consume API resources (e.g., chat, voice)
 *
 * F-06: Triggers admin counts push when budget changes
 *
 * @param amount Amount in EUR to increment
 * @returns Updated budget data
 */
export async function incrementTrialBudgetWithPublish(
  amount: number,
): Promise<MonthlyBudgetData> {
  try {
    log.debug("Incrementing trial budget", { amount });

    // Update budget
    const updated = await incrementBudget(amount);

    // Trigger admin counts publish (non-blocking)
    calculateAndPublishAdminCounts("trial-budget-increment").catch((err) => {
      // Error already logged in calculateAndPublishAdminCounts
      log.debug("Admin counts publish failed (non-blocking)", {
        error: String(err),
      });
    });

    return updated;
  } catch (error) {
    log.error("Failed to increment trial budget", { amount, error });
    throw error;
  }
}

/**
 * Get current monthly trial budget (no publish side effect)
 */
export async function getTrialBudget(): Promise<MonthlyBudgetData> {
  return await getMonthlyBudget();
}

/**
 * Check if trial budget is exhausted
 */
export async function isTrialBudgetExhausted(): Promise<boolean> {
  return await isBudgetExhausted();
}

/**
 * Get remaining trial budget in EUR
 */
export async function getRemainingTrialBudget(): Promise<number> {
  return await getRemainingBudget();
}
