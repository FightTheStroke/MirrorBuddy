/**
 * @file auto-save.ts
 * @brief Auto-save utility for tool results
 */

import { logger } from '@/lib/logger';
import type { ToolType } from '@/types/tools';
import { getUserId } from './user-id';
import {
  saveMaterialToAPIWithId,
  generateContentHash,
} from './api';

export async function autoSaveMaterial(
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

