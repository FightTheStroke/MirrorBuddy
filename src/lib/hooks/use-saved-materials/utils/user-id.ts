/**
 * @file user-id.ts
 * @brief User ID utility
 */

export function getUserId(): string {
  if (typeof window === 'undefined') return 'default-user';

  let userId = sessionStorage.getItem('mirrorbuddy-user-id');
  if (!userId) {
    userId = `user-${crypto.randomUUID()}`;
    sessionStorage.setItem('mirrorbuddy-user-id', userId);
  }
  return userId;
}

