/**
 * Robust Store Sync Utility
 * F-14: ETag/version tracking, If-Match headers, exponential backoff with jitter
 */

import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/auth';

/**
 * Sync result with ETag and status
 */
export interface SyncResult<T = unknown> {
  success: boolean;
  data?: T;
  etag?: string;
  status: number;
  error?: string;
  conflict?: boolean;
}

/**
 * Options for sync operations
 */
export interface SyncOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  etag?: string;
}

const DEFAULT_OPTIONS: Required<SyncOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  etag: '',
};

/**
 * Calculate exponential backoff with jitter
 * Jitter prevents thundering herd problem
 */
function calculateBackoff(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
  // Add random jitter (0-50% of delay)
  const jitter = exponentialDelay * Math.random() * 0.5;
  return exponentialDelay + jitter;
}

/**
 * Check if error is retryable
 * Don't retry client errors (4xx except 429) or abort errors
 */
function isRetryableError(status: number, error?: Error): boolean {
  if (error?.name === 'AbortError') return false;
  if (status === 429) return true; // Rate limit - retry
  if (status >= 400 && status < 500) return false; // Client errors - no retry
  return true; // Server errors - retry
}

/**
 * Enhanced fetch with exponential backoff and jitter
 */
export async function fetchWithBackoff<T>(
  url: string,
  options: RequestInit,
  syncOptions: SyncOptions = {}
): Promise<SyncResult<T>> {
  const { maxRetries, baseDelayMs, maxDelayMs } = { ...DEFAULT_OPTIONS, ...syncOptions };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await csrfFetch(url, options);
      const etag = response.headers.get('etag') || undefined;

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const data = contentType?.includes('application/json')
          ? await response.json()
          : undefined;

        return { success: true, data, etag, status: response.status };
      }

      // Handle specific status codes
      if (response.status === 412) {
        // Precondition Failed - ETag mismatch (conflict)
        logger.warn('Sync conflict detected (ETag mismatch)', { url });
        return { success: false, status: 412, conflict: true, error: 'Conflict' };
      }

      if (!isRetryableError(response.status)) {
        const errorText = await response.text().catch(() => 'Unknown error');
        logger.warn('Non-retryable error', { url, status: response.status, error: errorText });
        return { success: false, status: response.status, error: errorText };
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      const error = err as Error;

      if (attempt === maxRetries) {
        logger.warn('Max retries reached', { url, error: error.message, attempts: maxRetries + 1 });
        return { success: false, status: 0, error: error.message };
      }

      if (!isRetryableError(0, error)) {
        return { success: false, status: 0, error: error.message };
      }

      const delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs);
      logger.debug('Retrying after backoff', { url, attempt: attempt + 1, delayMs: Math.round(delay) });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { success: false, status: 0, error: 'Exhausted retries' };
}

/**
 * Sync data with ETag/If-Match support for optimistic concurrency
 */
export async function syncWithETag<T>(
  url: string,
  data: unknown,
  options: SyncOptions = {}
): Promise<SyncResult<T>> {
  const { etag } = { ...DEFAULT_OPTIONS, ...options };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add If-Match header if we have an ETag
  if (etag) {
    headers['If-Match'] = etag;
  }

  return fetchWithBackoff<T>(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  }, options);
}

/**
 * Load data with ETag tracking
 */
export async function loadWithETag<T>(
  url: string,
  options: SyncOptions = {}
): Promise<SyncResult<T>> {
  return fetchWithBackoff<T>(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  }, options);
}

/**
 * Handle sync conflict by reloading data from server
 * Returns the fresh data if reload succeeds
 */
export async function handleConflict<T>(
  loadUrl: string,
  options: SyncOptions = {}
): Promise<SyncResult<T>> {
  logger.info('Handling sync conflict by reloading from server', { url: loadUrl });
  return loadWithETag<T>(loadUrl, options);
}

/**
 * Store sync state interface
 */
export interface SyncState {
  etag: string | null;
  lastSyncedAt: Date | null;
  pendingSync: boolean;
  syncError: string | null;
}

/**
 * Initial sync state
 */
export const initialSyncState: SyncState = {
  etag: null,
  lastSyncedAt: null,
  pendingSync: false,
  syncError: null,
};
