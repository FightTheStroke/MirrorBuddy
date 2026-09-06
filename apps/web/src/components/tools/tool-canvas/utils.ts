/**
 * Utility functions for tool canvas
 */

import { requireClientUserId } from '@/lib/auth/client-auth';

/**
 * Get user ID from cookie (secure, server-set authentication)
 */
export function getUserId(): string {
  return requireClientUserId();
}
