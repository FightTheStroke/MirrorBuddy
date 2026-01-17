/**
 * Utility functions for Archive View
 */

import { logger } from '@/lib/logger';

/**
 * Format date in Italian locale
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Update a material's bookmark or rating via API
 */
export async function updateMaterialInteraction(
  toolId: string,
  updates: { isBookmarked?: boolean; userRating?: number }
): Promise<boolean> {
  try {
    const response = await fetch('/api/materials', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId, ...updates }),
    });
    return response.ok;
  } catch (error) {
    logger.error('Failed to update material interaction', { toolId }, error);
    return false;
  }
}
