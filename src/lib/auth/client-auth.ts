/**
 * Client-side auth helper
 * Reads userId from HTTP cookie instead of sessionStorage
 */

/**
 * Get user ID from client-readable cookie
 * Returns null if no valid cookie found
 *
 * Note: This reads from 'mirrorbuddy-user-id-client' cookie which is NOT httpOnly.
 * The server uses a separate httpOnly signed cookie for authentication.
 */
export function getUserIdFromCookie(): string | null {
  if (typeof document === "undefined") {
    return null; // SSR safety
  }

  // Read from client-readable cookie (not httpOnly)
  const cookieMatch = document.cookie.match(
    /mirrorbuddy-user-id-client=([^;]+)/,
  );
  if (cookieMatch && cookieMatch[1]) {
    return decodeURIComponent(cookieMatch[1]);
  }

  return null;
}

/**
 * Check if user is authenticated (client-side)
 */
export function isAuthenticated(): boolean {
  return getUserIdFromCookie() !== null;
}
