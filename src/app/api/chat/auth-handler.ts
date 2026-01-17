/**
 * Chat API authentication handling
 * Extracts and verifies user identity from cookies
 */

import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { isSignedCookie, verifyCookieValue } from '@/lib/auth/cookie-signing';

const COOKIE_NAME = 'mirrorbuddy-user-id';

/**
 * Extract userId from signed or legacy unsigned cookies
 */
export async function extractUserId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value;

  if (!cookieValue) {
    return undefined;
  }

  if (isSignedCookie(cookieValue)) {
    const verification = verifyCookieValue(cookieValue);
    if (verification.valid) {
      return verification.value;
    }
    logger.warn('Invalid signed cookie in /api/chat', {
      error: verification.error,
    });
    return undefined;
  }

  // Legacy unsigned cookie
  return cookieValue;
}
