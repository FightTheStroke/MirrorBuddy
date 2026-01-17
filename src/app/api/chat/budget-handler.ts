/**
 * Chat API budget handling
 * Manages user budget checking and tracking
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { TOKEN_COST_PER_UNIT } from './stream/helpers';

export interface UserSettings {
  provider: string;
  budgetLimit: number;
  totalSpent: number;
  adaptiveDifficultyMode?: string | null;
}

const BUDGET_WARNING_THRESHOLD = 0.8;

/**
 * Load user settings including provider preference and budget
 */
export async function loadUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const settings = await prisma.settings.findUnique({
      where: { userId },
      select: {
        provider: true,
        budgetLimit: true,
        totalSpent: true,
        adaptiveDifficultyMode: true,
      },
    });
    return settings;
  } catch (e) {
    logger.debug('Failed to load user settings', { error: String(e) });
    return null;
  }
}

/**
 * Check if user has exceeded their budget limit
 * Returns error response if exceeded, null otherwise
 */
export function checkBudgetLimit(
  userId: string,
  settings: UserSettings
): NextResponse | null {
  if (settings.totalSpent >= settings.budgetLimit) {
    logger.warn('Budget limit exceeded', {
      userId,
      totalSpent: settings.totalSpent,
      budgetLimit: settings.budgetLimit,
    });
    return NextResponse.json(
      {
        error: 'Budget limit exceeded',
        message: `Hai raggiunto il limite di budget di $${settings.budgetLimit.toFixed(2)}. Puoi aumentarlo nelle impostazioni.`,
        totalSpent: settings.totalSpent,
        budgetLimit: settings.budgetLimit,
        settingsUrl: '/settings',
      },
      { status: 402 }
    );
  }
  return null;
}

/**
 * Log budget warning if user is approaching limit
 */
export function checkBudgetWarning(userId: string, settings: UserSettings): void {
  if (settings.budgetLimit > 0) {
    const usageRatio = settings.totalSpent / settings.budgetLimit;
    if (usageRatio >= BUDGET_WARNING_THRESHOLD && usageRatio < 1) {
      logger.info('Budget warning threshold reached', {
        userId,
        totalSpent: settings.totalSpent,
        budgetLimit: settings.budgetLimit,
        usagePercent: Math.round(usageRatio * 100),
      });
    }
  }
}

/**
 * Update user's budget after a successful chat completion
 */
export async function updateBudget(
  userId: string,
  totalTokens: number,
  currentSpent: number
): Promise<void> {
  try {
    const estimatedCost = totalTokens * TOKEN_COST_PER_UNIT;
    await prisma.settings.update({
      where: { userId },
      data: {
        totalSpent: {
          increment: estimatedCost,
        },
      },
    });
    logger.debug('Budget updated', {
      userId,
      tokensUsed: totalTokens,
      estimatedCost,
      newTotal: currentSpent + estimatedCost,
    });
  } catch (e) {
    logger.warn('Failed to update budget', { userId, error: String(e) });
  }
}
