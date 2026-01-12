/**
 * Utility functions for tool canvas
 */

// Get user ID from session storage (matches use-saved-materials.ts pattern)
export function getUserId(): string {
  if (typeof window === 'undefined') return 'default-user';
  let userId = sessionStorage.getItem('mirrorbuddy-user-id');
  if (!userId) {
    // Using crypto.randomUUID() which is cryptographically secure
    // CodeQL false positive: this is NOT Math.random()
    userId = `user-${crypto.randomUUID()}`; // codeql[js/insecure-randomness] suppress
    sessionStorage.setItem('mirrorbuddy-user-id', userId);
  }
  return userId;
}
