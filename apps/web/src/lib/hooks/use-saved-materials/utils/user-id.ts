/**
 * @file user-id.ts
 * @brief User ID utility
 */

import { requireClientUserId } from '@/lib/auth/client-auth';

export function getUserId(): string {
  return requireClientUserId();
}
