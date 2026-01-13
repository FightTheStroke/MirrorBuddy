/**
 * Utility functions for tool canvas
 */

/**
 * Get user ID from session storage (matches use-saved-materials.ts pattern)
 * Uses crypto.randomUUID() which is a CSPRNG (Cryptographically Secure PRNG)
 * per Web Crypto API spec: https://w3c.github.io/webcrypto/#Crypto-method-randomUUID
 */
export function getUserId(): string {
  if (typeof window === 'undefined') return 'default-user';
  let userId = sessionStorage.getItem('mirrorbuddy-user-id');
  if (!userId) {
    // crypto.randomUUID() uses CSPRNG internally - NOT insecure Math.random()
    // See: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
    // lgtm[js/insecure-randomness]
    userId = `user-${crypto.randomUUID()}`;
    sessionStorage.setItem('mirrorbuddy-user-id', userId);
  }
  return userId;
}
