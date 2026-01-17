/**
 * Client-side auth helper
 * Reads userId from HTTP cookie instead of sessionStorage
 */

/**
 * Get user ID from cookie (client-side)
 * Returns null if no valid cookie found
 */
export function getUserIdFromCookie(): string | null {
  if (typeof document === "undefined") {
    return null; // SSR safety
  }

  const cookieMatch = document.cookie.match(/mirrorbuddy-user-id=([^;]+)/);
  if (cookieMatch && cookieMatch[1]) {
    // Cookie value may be signed - extract just the ID part before any signature
    const value = decodeURIComponent(cookieMatch[1]);
    // Signed cookies have format: value.signature
    const dotIndex = value.indexOf(".");
    return dotIndex > 0 ? value.substring(0, dotIndex) : value;
  }

  return null;
}

/**
 * Check if user is authenticated (client-side)
 */
export function isAuthenticated(): boolean {
  return getUserIdFromCookie() !== null;
}
