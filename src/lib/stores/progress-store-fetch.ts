/**
 * Progress Store Fetch Utility
 * Fire-and-forget fetch with exponential backoff retry
 */

import { logger } from '@/lib/logger';

/**
 * Fire-and-forget fetch with exponential backoff retry.
 * @param url - API endpoint
 * @param options - Fetch options
 * @param maxRetries - Maximum retry attempts (default: 3)
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<void> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return;
      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        logger.warn('Client error, not retrying', { url, status: response.status });
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      if (attempt === maxRetries) {
        logger.warn('Max retries reached for API call', { url, error: err });
        return;
      }
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
