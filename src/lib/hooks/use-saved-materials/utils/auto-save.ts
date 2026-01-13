/**
 * @file auto-save.ts
 * @brief Auto-save utility for tool results with debouncing
 */

import { logger } from '@/lib/logger';
import type { ToolType } from '@/types/tools';
import { getUserId } from './user-id';
import {
  saveMaterialToAPIWithId,
  generateContentHash,
} from './api';

// Debounce delay in milliseconds
const AUTO_SAVE_DEBOUNCE_MS = 1000;

// Track pending saves per key to prevent duplicates
const pendingSaves = new Map<string, boolean>();
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Internal save function (not debounced)
 */
async function doAutoSave(
  toolType: ToolType,
  title: string,
  content: Record<string, unknown>,
  options?: { subject?: string; toolId?: string }
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const userId = getUserId();
    const toolId =
      options?.toolId || generateContentHash(toolType, title, content);

    const result = await saveMaterialToAPIWithId(
      userId,
      toolId,
      toolType,
      title,
      content,
      options
    );
    return result !== null;
  } catch (error) {
    logger.error('Auto-save material failed', {
      toolType,
      title,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Auto-save material with debouncing to prevent duplicate saves.
 * Uses content hash as key so each unique piece of content has its own timer.
 */
export async function autoSaveMaterial(
  toolType: ToolType,
  title: string,
  content: Record<string, unknown>,
  options?: { subject?: string; toolId?: string }
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const saveKey = options?.toolId || generateContentHash(toolType, title, content);

  // Skip if save already in progress for this key
  if (pendingSaves.get(saveKey)) {
    logger.debug('Auto-save skipped - already pending', { saveKey, toolType });
    return true;
  }

  // Clear existing timer for this key
  const existingTimer = saveTimers.get(saveKey);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Return a promise that resolves when the debounced save completes
  return new Promise((resolve) => {
    const timer = setTimeout(async () => {
      saveTimers.delete(saveKey);
      pendingSaves.set(saveKey, true);

      try {
        const result = await doAutoSave(toolType, title, content, options);
        resolve(result);
      } finally {
        pendingSaves.delete(saveKey);
      }
    }, AUTO_SAVE_DEBOUNCE_MS);

    saveTimers.set(saveKey, timer);
  });
}

/**
 * Force immediate save (bypasses debouncing)
 * Use for explicit user save actions
 */
export async function forceSaveMaterial(
  toolType: ToolType,
  title: string,
  content: Record<string, unknown>,
  options?: { subject?: string; toolId?: string }
): Promise<boolean> {
  const saveKey = options?.toolId || generateContentHash(toolType, title, content);

  // Clear any pending debounced save
  const existingTimer = saveTimers.get(saveKey);
  if (existingTimer) {
    clearTimeout(existingTimer);
    saveTimers.delete(saveKey);
  }

  // Wait if save is in progress
  if (pendingSaves.get(saveKey)) {
    logger.debug('Force save waiting for pending save', { saveKey });
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return doAutoSave(toolType, title, content, options);
}

