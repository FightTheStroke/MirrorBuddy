/**
 * Utility functions for tool canvas
 */

// Get user ID from session storage (matches use-saved-materials.ts pattern)
export function getUserId(): string {
  if (typeof window === 'undefined') return 'default-user';
  let userId = sessionStorage.getItem('mirrorbuddy-user-id');
  if (!userId) {
    // crypto.randomUUID() is cryptographically secure (lgtm[js/insecure-randomness])
    userId = `user-${crypto.randomUUID()}`;
    sessionStorage.setItem('mirrorbuddy-user-id', userId);
  }
  return userId;
}
