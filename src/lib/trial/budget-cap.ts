import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';
import { isRedisConfigured as checkRedisConfig, getRedisUrl, getRedisToken } from '@/lib/redis';

export interface MonthlyBudgetData {
  used: number;
  limit: number;
  currency: 'EUR';
}

// ============================================================================
// REDIS INITIALIZATION - Lazy init to prevent module-load crashes
// ============================================================================

let redisInstance: Redis | null = null;

function getRedis(): Redis | null {
  if (!checkRedisConfig()) {
    return null;
  }

  if (!redisInstance) {
    redisInstance = new Redis({
      url: getRedisUrl()!.trim(),
      token: getRedisToken()!.trim(),
    });
  }

  return redisInstance;
}

const TRIAL_BUDGET_LIMIT_EUR = Number(process.env.TRIAL_BUDGET_LIMIT_EUR || 100);

function getMonthlyKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `mirrorbuddy:trial:budget:${year}-${month}`;
}

async function getMonthlyBudget(): Promise<MonthlyBudgetData> {
  const redis = getRedis();

  // Fallback when Redis not configured (development, CI)
  if (!redis) {
    logger.warn('Redis not configured, using unlimited budget fallback');
    return {
      used: 0,
      limit: TRIAL_BUDGET_LIMIT_EUR,
      currency: 'EUR',
    };
  }

  try {
    const key = getMonthlyKey();
    const data = await redis.get(key);

    if (data) {
      return data as MonthlyBudgetData;
    }

    // Initialize new month
    const initialData: MonthlyBudgetData = {
      used: 0,
      limit: TRIAL_BUDGET_LIMIT_EUR,
      currency: 'EUR',
    };
    await redis.setex(key, 30 * 24 * 60 * 60, initialData); // 30 days TTL
    return initialData;
  } catch (error) {
    logger.error('Budget cache error', undefined, error as Error);
    return {
      used: 0,
      limit: TRIAL_BUDGET_LIMIT_EUR,
      currency: 'EUR',
    };
  }
}

async function incrementBudget(amount: number): Promise<MonthlyBudgetData> {
  const redis = getRedis();

  // Fallback when Redis not configured
  if (!redis) {
    logger.warn('Redis not configured, budget increment skipped');
    return await getMonthlyBudget();
  }

  try {
    const key = getMonthlyKey();
    const current = await getMonthlyBudget();
    const updated: MonthlyBudgetData = {
      ...current,
      used: Math.max(0, current.used + amount),
    };
    await redis.setex(key, 30 * 24 * 60 * 60, updated);
    return updated;
  } catch (error) {
    logger.error('Budget increment error', { amount }, error as Error);
    return await getMonthlyBudget();
  }
}

async function isBudgetExhausted(): Promise<boolean> {
  const budget = await getMonthlyBudget();
  return budget.used >= budget.limit;
}

async function getRemainingBudget(): Promise<number> {
  const budget = await getMonthlyBudget();
  return Math.max(0, budget.limit - budget.used);
}

export { getMonthlyBudget, incrementBudget, isBudgetExhausted, getRemainingBudget };
