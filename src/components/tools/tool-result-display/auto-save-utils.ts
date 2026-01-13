/**
 * Auto-save debounce utilities
 * Handles debouncing, dedup, and retry logic for material saves
 */

import { logger } from '@/lib/logger';

// Debounce delay (500ms)
export const AUTO_SAVE_DEBOUNCE_MS = 500;

// Global tracking for debounce timers: Map<dedupKey, timeoutId>
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Global tracking for saved/pending materials: Set<dedupKey>
const savedMaterialsCache = new Set<string>();

/**
 * Debounced auto-save helper
 * Prevents duplicate saves and allows retry on failure
 *
 * @param toolType - Type of material (quiz, flashcard, mindmap, etc.)
 * @param dedupKey - Unique key for dedup (format: toolId-toolType)
 * @param saveFunction - Async save function to execute
 */
export async function debouncedAutoSave(
  toolType: string,
  dedupKey: string,
  saveFunction: () => Promise<boolean>
): Promise<void> {
  // Skip if already saved (in flight or completed)
  if (savedMaterialsCache.has(dedupKey)) {
    logger.debug('Auto-save skipped - already saved', { dedupKey, toolType });
    return;
  }

  // Clear existing timer for this dedup key
  const existingTimer = saveTimers.get(dedupKey);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set up new debounced timer
  const timer = setTimeout(async () => {
    saveTimers.delete(dedupKey);
    savedMaterialsCache.add(dedupKey);

    try {
      const success = await saveFunction();
      if (!success) {
        // On failure, remove from cache to allow retry
        savedMaterialsCache.delete(dedupKey);
        logger.warn('Auto-save failed - removed from cache for retry', { dedupKey, toolType });
      } else {
        logger.info('Auto-saved successfully', { dedupKey, toolType });
      }
    } catch (error) {
      // On error, remove from cache to allow retry
      savedMaterialsCache.delete(dedupKey);
      logger.error('Auto-save error - removed from cache for retry', {
        dedupKey,
        toolType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, AUTO_SAVE_DEBOUNCE_MS);

  saveTimers.set(dedupKey, timer);
}
