/**
 * Resend Email Quota Integration (F-05, F-22)
 *
 * Queries Resend API to get current email usage metrics for real-time
 * stress monitoring and automated limit queries.
 *
 * Tracks daily and monthly email quotas:
 * - 100 emails per day (free tier)
 * - 3000 emails per month (free tier)
 *
 * Environment Variables Required:
 *   - RESEND_API_KEY: API key from Resend dashboard
 *
 * Usage:
 *   const limits = await getResendLimits();
 *   console.log(limits.emailsToday.used, limits.emailsToday.limit);
 */

import { logger } from '@/lib/logger';
import { calculateStatus, AlertStatus } from './threshold-logic';

/**
 * Email usage metrics (used/limit pair) with threshold status (F-25)
 */
export interface EmailUsage {
  used: number; // Emails sent in current period
  limit: number; // Limit for current period
  percent: number; // Usage percentage (0-100)
  status: AlertStatus; // Alert status from threshold logic (F-25)
}

/**
 * Complete Resend email limits snapshot
 */
export interface ResendLimits {
  emailsToday: EmailUsage;
  emailsMonth: EmailUsage;
  timestamp: number; // Unix timestamp of query
  error?: string; // Error message if query failed
}

/**
 * Resend Free Tier Limits
 * Source: https://resend.com/pricing
 */
const RESEND_FREE_LIMITS = {
  EMAILS_PER_DAY: 100,
  EMAILS_PER_MONTH: 3000,
};

/**
 * Cache for rate limiting
 */
interface CacheEntry {
  data: ResendLimits;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
let cache: CacheEntry | null = null;

/**
 * Query Resend API for email metrics
 *
 * Fetches email statistics from Resend via direct HTTP API calls.
 * Falls back gracefully if API is unavailable.
 *
 * @returns Promise<ResendLimits> Current usage metrics
 */
export async function getResendLimits(): Promise<ResendLimits> {
  // Check cache first (rate limiting)
  if (cache && cache.expiresAt > Date.now()) {
    logger.debug('Returning cached Resend limits');
    return cache.data;
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    const error = 'RESEND_API_KEY not configured';
    logger.warn(error);
    return createEmptyLimits(error);
  }

  try {
    // Query Resend API for email statistics
    const stats = await queryResendEmailStats(apiKey);

    // Get emails sent today and this month from response
    const emailsToday = stats.dailyCount ?? 0;
    const emailsMonth = stats.monthlyCount ?? 0;

    const todayPercent = calculatePercent(emailsToday, RESEND_FREE_LIMITS.EMAILS_PER_DAY);
    const monthPercent = calculatePercent(emailsMonth, RESEND_FREE_LIMITS.EMAILS_PER_MONTH);

    const limits: ResendLimits = {
      emailsToday: {
        used: emailsToday,
        limit: RESEND_FREE_LIMITS.EMAILS_PER_DAY,
        percent: todayPercent,
        status: calculateStatus(todayPercent), // F-25
      },
      emailsMonth: {
        used: emailsMonth,
        limit: RESEND_FREE_LIMITS.EMAILS_PER_MONTH,
        percent: monthPercent,
        status: calculateStatus(monthPercent), // F-25
      },
      timestamp: Date.now(),
    };

    // Update cache
    cache = {
      data: limits,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    logger.info('Resend limits fetched successfully', {
      emailsToday: `${limits.emailsToday.percent.toFixed(1)}%`,
      emailsMonth: `${limits.emailsMonth.percent.toFixed(1)}%`,
    });

    return limits;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to fetch Resend limits', undefined, error as Error);
    return createEmptyLimits(errorMsg);
  }
}

/**
 * Query Resend API for email statistics
 *
 * Makes HTTP request to Resend API to get email metrics.
 * The API returns paginated email list which we use to count sent emails.
 *
 * @param apiKey - Resend API key
 * @returns Promise with daily and monthly counts
 * @throws Error if API request fails
 */
async function queryResendEmailStats(
  apiKey: string,
): Promise<{ dailyCount: number; monthlyCount: number }> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    // Fetch emails from Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Provide specific error messages for auth issues
      if (response.status === 401) {
        throw new Error('API key invalid - check RESEND_API_KEY in environment');
      }
      if (response.status === 403) {
        throw new Error('API key lacks required permissions');
      }
      throw new Error(`Resend API error: ${response.status} ${response.statusText}`);
    }

    const emailsData = await response.json();

    // Count emails sent today and this month
    const emails = Array.isArray(emailsData.data) ? emailsData.data : [];

    let dailyCount = 0;
    let monthlyCount = 0;

    for (const email of emails) {
      const createdAt = new Date(email.created_at);

      // Count for entire month
      if (createdAt >= startOfMonth && createdAt <= now) {
        monthlyCount++;
      }

      // Count for today
      if (createdAt >= startOfDay && createdAt <= now) {
        dailyCount++;
      }
    }

    logger.debug('Resend email stats', {
      dailyCount,
      monthlyCount,
      totalEmails: emails.length,
    });

    return { dailyCount, monthlyCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to query Resend API', undefined, error as Error);
    throw new Error(`Resend API query failed: ${message}`);
  }
}

/**
 * Calculate percentage (0-100)
 */
function calculatePercent(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min(100, (used / limit) * 100);
}

/**
 * Create empty limits response on error
 */
function createEmptyLimits(error: string): ResendLimits {
  return {
    emailsToday: {
      used: 0,
      limit: RESEND_FREE_LIMITS.EMAILS_PER_DAY,
      percent: 0,
      status: 'ok',
    },
    emailsMonth: {
      used: 0,
      limit: RESEND_FREE_LIMITS.EMAILS_PER_MONTH,
      percent: 0,
      status: 'ok',
    },
    timestamp: Date.now(),
    error,
  };
}

/**
 * Clear cache (for testing)
 */
export function clearResendLimitsCache(): void {
  cache = null;
}

/**
 * Check if email quota is approaching limits (F-05 stress detection)
 *
 * @param thresholdPercent - Percentage threshold (default: 80%)
 * @returns Promise<boolean> True if either daily or monthly quota exceeds threshold
 */
export async function isEmailQuotaStressed(thresholdPercent: number = 80): Promise<boolean> {
  try {
    const limits = await getResendLimits();
    return (
      limits.emailsToday.percent >= thresholdPercent ||
      limits.emailsMonth.percent >= thresholdPercent
    );
  } catch (error) {
    logger.error('Failed to check email quota stress', undefined, error);
    return false; // Fail open - don't block on monitoring errors
  }
}

/**
 * Get human-readable email quota report (F-05 visibility)
 *
 * @returns Promise<string> Formatted report of email usage
 */
export async function getEmailQuotaReport(): Promise<string> {
  try {
    const limits = await getResendLimits();
    const lines = [
      `Daily: ${limits.emailsToday.used}/${limits.emailsToday.limit} emails (${limits.emailsToday.percent.toFixed(1)}%)`,
      `Monthly: ${limits.emailsMonth.used}/${limits.emailsMonth.limit} emails (${limits.emailsMonth.percent.toFixed(1)}%)`,
    ];

    if (limits.error) {
      lines.push(`Warning: ${limits.error}`);
    }

    return lines.join('\n');
  } catch (error) {
    return `Error fetching email quota: ${error}`;
  }
}
