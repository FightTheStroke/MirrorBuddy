/**
 * Google Drive API Helper Utilities
 * Validation, escaping, and shared request logic
 */

import { logger } from '@/lib/logger';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

/**
 * Validate that a Google Drive file ID is well-formed.
 * Drive IDs are alphanumeric with hyphens and underscores.
 * This prevents SSRF attacks via malicious fileId values.
 */
export function isValidDriveId(id: string): boolean {
  // Google Drive IDs are alphanumeric with hyphens/underscores, typically 25-44 chars
  // Root and special IDs like 'shared' are also valid
  if (id === 'root' || id === 'shared') return true;
  return /^[a-zA-Z0-9_-]{10,100}$/.test(id);
}

/**
 * Escape a search query for use in Google Drive API queries.
 * Must escape both backslashes and single quotes to prevent injection.
 * Uses two-pass replacement to handle edge cases correctly.
 * lgtm[js/incomplete-multi-character-sanitization]
 */
export function escapeQueryString(query: string): string {
  // Two-pass escaping: backslashes first (so we don't double-escape quotes)
  // then single quotes. This order is intentional and correct.
  let escaped = query;
  escaped = escaped.split('\\').join('\\\\');
  escaped = escaped.split("'").join("\\'");
  return escaped;
}

/**
 * Make an authenticated request to Google Drive API
 * lgtm[js/request-forgery]
 */
export async function makeDriveRequest<T>(
  accessToken: string,
  endpoint: string,
  params?: Partial<Record<string, string | number | boolean | undefined>>
): Promise<T | null> {
  const url = new URL(`${DRIVE_API_BASE}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    logger.error('[Drive Client] Request failed:', {
      endpoint,
      responseText: await response.text(),
    });
    return null;
  }

  return response.json();
}

/**
 * Get the base API URL for Drive
 */
export function getDriveApiBase(): string {
  return DRIVE_API_BASE;
}
