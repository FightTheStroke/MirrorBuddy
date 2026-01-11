/**
 * Utility functions for tool canvas
 */

// Get user ID from session storage (matches use-saved-materials.ts pattern)
export function getUserId(): string {
  if (typeof window === 'undefined') return 'default-user';
  let userId = sessionStorage.getItem('mirrorbuddy-user-id');
  if (!userId) {
    userId = `user-${crypto.randomUUID()}`;
    sessionStorage.setItem('mirrorbuddy-user-id', userId);
  }
  return userId;
}
