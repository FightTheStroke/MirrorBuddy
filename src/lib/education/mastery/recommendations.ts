/**
 * @file recommendations.ts
 * @brief Topic recommendation functions
 */

import type { MasteryState, Topic } from './types';
import { SkillStatus } from './types';
import { PROFICIENT_THRESHOLD } from './constants';
import { canAccessTopic, isMastered } from './core';

/**
 * Get recommended topics to study next
 * Priority: 1) Gaps (low mastery with attempts), 2) In-progress, 3) New accessible topics
 */
export function getRecommendedTopics(
  state: MasteryState,
  allTopics: Topic[]
): Topic[] {
  const recommendations: Array<{ topic: Topic; priority: number; lastPractice: number }> = [];

  for (const topic of allTopics) {
    // Skip if prerequisites not met
    if (!canAccessTopic(state, topic)) {
      continue;
    }

    // Skip if already mastered
    if (isMastered(state, topic.id)) {
      continue;
    }

    const progress = state.topics.get(topic.id);
    let priority = 2; // Default: new topic

    if (progress) {
      const masteryRatio = progress.masteryLevel / 100;

      // Priority 0: Gaps (attempted but struggling)
      if (progress.attempts >= 3 && masteryRatio < 0.5) {
        priority = 0;
      }
      // Priority 1: In progress (familiar or proficient)
      else if (
        progress.status === SkillStatus.FAMILIAR ||
        progress.status === SkillStatus.PROFICIENT
      ) {
        priority = 1;
      }
    }

    recommendations.push({
      topic,
      priority,
      lastPractice: progress?.lastAttempt.getTime() ?? 0,
    });
  }

  // Sort by priority (lower is better), then by oldest practice first (spaced repetition)
  recommendations.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.lastPractice - b.lastPractice;
  });

  return recommendations.map((r) => r.topic);
}

/**
 * Identify topics with gaps (low mastery despite attempts)
 */
export function identifyGaps(
  state: MasteryState,
  allTopics: Topic[],
  subject?: string
): Topic[] {
  const gaps: Array<{ topic: Topic; mastery: number }> = [];

  for (const topic of allTopics) {
    // Filter by subject if specified
    if (subject && topic.subject !== subject) {
      continue;
    }

    const progress = state.topics.get(topic.id);
    if (!progress) continue;

    const masteryRatio = progress.masteryLevel / 100;

    // Gap: attempted at least 3 times but below proficient threshold
    if (progress.attempts >= 3 && masteryRatio < PROFICIENT_THRESHOLD) {
      gaps.push({ topic, mastery: masteryRatio });
    }
  }

  // Sort by lowest mastery first
  gaps.sort((a, b) => a.mastery - b.mastery);

  return gaps.slice(0, 10).map((g) => g.topic);
}

