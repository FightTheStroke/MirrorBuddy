/**
 * @file persistence.ts
 * @brief Persistence functions for mastery state
 * Issue #64: Consolidate localStorage to Database
 */

import { logger } from '@/lib/logger';
import type { MasteryState, TopicProgress } from './types';

/**
 * Serialize mastery state for API storage
 */
function serializeMasteryState(state: MasteryState): unknown[] {
  return Array.from(state.topics.entries()).map(([id, progress]) => ({
    id,
    ...progress,
    lastAttempt: progress.lastAttempt.toISOString(),
    masteredAt: progress.masteredAt?.toISOString(),
  }));
}

/**
 * Deserialize mastery state from API response
 */
function deserializeMasteryState(data: unknown[]): MasteryState {
  const topics = new Map<string, TopicProgress>();

  for (const item of data || []) {
    const typedItem = item as {
      id: string;
      topicId: string;
      totalQuestions: number;
      correctAnswers: number;
      masteryLevel: number;
      isMastered: boolean;
      attempts: number;
      lastAttempt: string;
      currentDifficulty: number;
      status: string;
      masteredAt?: string;
    };
    topics.set(typedItem.id, {
      ...typedItem,
      lastAttempt: new Date(typedItem.lastAttempt),
      masteredAt: typedItem.masteredAt ? new Date(typedItem.masteredAt) : undefined,
      status: typedItem.status as any,
    });
  }

  return { topics };
}

/**
 * Save mastery state to database via API
 */
export async function saveMasteryState(state: MasteryState): Promise<void> {
  try {
    const serialized = serializeMasteryState(state);
    await fetch('/api/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masteries: serialized }),
    });
  } catch (error) {
    logger.error('[Mastery] Failed to save state', { error: String(error) });
  }
}

/**
 * Load mastery state from database via API
 */
export async function loadMasteryState(): Promise<MasteryState> {
  try {
    const response = await fetch('/api/progress');
    if (!response.ok) {
      return { topics: new Map() };
    }

    const data = await response.json();
    return deserializeMasteryState(data.masteries || []);
  } catch (error) {
    logger.error('[Mastery] Failed to load state', { error: String(error) });
    return { topics: new Map() };
  }
}

/**
 * Clear all mastery data
 */
export async function clearMasteryState(): Promise<void> {
  try {
    await fetch('/api/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masteries: [] }),
    });
  } catch (error) {
    logger.error('[Mastery] Failed to clear state', { error: String(error) });
  }
}

