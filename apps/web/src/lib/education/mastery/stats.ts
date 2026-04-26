/**
 * @file stats.ts
 * @brief Mastery statistics functions
 */

import type { MasteryState, Topic, TopicProgress, MasteryStats } from './types';
import { SkillStatus } from './types';

/**
 * Get overall mastery statistics
 */
export function getMasteryStats(
  state: MasteryState,
  subject?: string,
  allTopics?: Topic[]
): MasteryStats {
  let totalTopics = 0;
  let masteredCount = 0;
  let proficientCount = 0;
  let inProgressCount = 0;
  let notStartedCount = 0;
  let totalAttempts = 0;
  let totalCorrect = 0;
  let totalMastery = 0;
  let countedTopics = 0;

  // If allTopics provided, use it to count all possible topics
  if (allTopics) {
    const filteredTopics = subject
      ? allTopics.filter((t) => t.subject === subject)
      : allTopics;

    totalTopics = filteredTopics.length;

    for (const topic of filteredTopics) {
      const progress = state.topics.get(topic.id);

      if (!progress) {
        notStartedCount++;
        continue;
      }

      countedTopics++;
      totalMastery += progress.masteryLevel;
      totalAttempts += progress.attempts;
      totalCorrect += progress.correctAnswers;

      switch (progress.status) {
        case SkillStatus.MASTERED:
          masteredCount++;
          break;
        case SkillStatus.PROFICIENT:
          proficientCount++;
          break;
        case SkillStatus.FAMILIAR:
        case SkillStatus.ATTEMPTED:
          inProgressCount++;
          break;
      }
    }
  } else {
    // Count only tracked topics
    for (const progress of state.topics.values()) {
      if (subject && progress.topicId.split(".")[0] !== subject) {
        continue;
      }

      totalTopics++;
      countedTopics++;
      totalMastery += progress.masteryLevel;
      totalAttempts += progress.attempts;
      totalCorrect += progress.correctAnswers;

      switch (progress.status) {
        case SkillStatus.MASTERED:
          masteredCount++;
          break;
        case SkillStatus.PROFICIENT:
          proficientCount++;
          break;
        case SkillStatus.FAMILIAR:
        case SkillStatus.ATTEMPTED:
          inProgressCount++;
          break;
        case SkillStatus.NOT_STARTED:
          notStartedCount++;
          break;
      }
    }
  }

  const averageMastery = countedTopics > 0 ? totalMastery / countedTopics : 0;
  const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

  return {
    totalTopics,
    masteredCount,
    proficientCount,
    inProgressCount,
    notStartedCount,
    averageMastery,
    totalAttempts,
    totalCorrect,
    accuracy,
  };
}

/**
 * Get progress for a specific topic
 */
export function getTopicProgress(
  state: MasteryState,
  topicId: string
): TopicProgress | null {
  return state.topics.get(topicId) ?? null;
}

