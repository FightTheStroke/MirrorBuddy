/**
 * @file core.ts
 * @brief Core mastery functions
 */

import type { MasteryState, Topic, TopicProgress } from './types';
import { SkillStatus } from './types';
import { MASTERY_THRESHOLD } from './constants';
import { calculateMastery, statusFromMastery, adjustDifficulty } from './calculations';
import { saveMasteryState } from './persistence';

/**
 * Record a practice attempt and update mastery
 */
export function recordAnswer(
  state: MasteryState,
  topicId: string,
  correct: boolean
): MasteryState {
  const newState = { ...state };
  const topics = new Map(state.topics);

  // Get current progress or create new
  const current = topics.get(topicId) || {
    topicId,
    totalQuestions: 0,
    correctAnswers: 0,
    masteryLevel: 0,
    isMastered: false,
    attempts: 0,
    lastAttempt: new Date(),
    currentDifficulty: 1.0,
    status: SkillStatus.NOT_STARTED,
  };

  // Update counts
  const newAttempts = current.attempts + 1;
  const newCorrect = current.correctAnswers + (correct ? 1 : 0);
  const newTotal = current.totalQuestions + 1;

  // Calculate new mastery (as 0-1 ratio)
  const masteryRatio = calculateMastery(
    newAttempts,
    newCorrect,
    current.masteryLevel / 100
  );
  const newMasteryLevel = masteryRatio * 100; // Convert to percentage

  // Determine new status
  const oldStatus = current.status;
  const newStatus = statusFromMastery(masteryRatio, newAttempts);
  const isMastered = masteryRatio >= MASTERY_THRESHOLD;

  // Adjust difficulty
  const newDifficulty = adjustDifficulty(current.currentDifficulty, correct);

  // Track mastered timestamp
  const masteredAt =
    newStatus === SkillStatus.MASTERED && oldStatus !== SkillStatus.MASTERED
      ? new Date()
      : current.masteredAt;

  // Update progress
  topics.set(topicId, {
    topicId,
    totalQuestions: newTotal,
    correctAnswers: newCorrect,
    masteryLevel: newMasteryLevel,
    isMastered,
    attempts: newAttempts,
    lastAttempt: new Date(),
    currentDifficulty: newDifficulty,
    status: newStatus,
    masteredAt,
  });

  newState.topics = topics;

  // Auto-save to database (fire and forget)
  void saveMasteryState(newState);

  return newState;
}

/**
 * Get mastery level for a topic (0-100)
 */
export function getMasteryLevel(state: MasteryState, topicId: string): number {
  const progress = state.topics.get(topicId);
  return progress?.masteryLevel ?? 0;
}

/**
 * Check if a topic has been mastered (>= 80%)
 */
export function isMastered(state: MasteryState, topicId: string): boolean {
  const progress = state.topics.get(topicId);
  return progress?.isMastered ?? false;
}

/**
 * Get current difficulty level for a topic
 */
export function getDifficulty(state: MasteryState, topicId: string): number {
  const progress = state.topics.get(topicId);
  return progress?.currentDifficulty ?? 1.0;
}

/**
 * Get status for a topic
 */
export function getStatus(state: MasteryState, topicId: string): SkillStatus {
  const progress = state.topics.get(topicId);
  return progress?.status ?? SkillStatus.NOT_STARTED;
}

/**
 * Check if a topic can be accessed based on prerequisites
 */
export function canAccessTopic(state: MasteryState, topic: Topic): boolean {
  // If no prerequisites, topic is accessible
  if (!topic.prerequisites || topic.prerequisites.length === 0) {
    return true;
  }

  // All prerequisites must be mastered
  return topic.prerequisites.every((prereqId) => isMastered(state, prereqId));
}

/**
 * Reset a topic's progress
 */
export function resetTopic(state: MasteryState, topicId: string): MasteryState {
  const newState = { ...state };
  const topics = new Map(state.topics);

  topics.delete(topicId);
  newState.topics = topics;

  // Auto-save to database (fire and forget)
  void saveMasteryState(newState);

  return newState;
}

/**
 * Reset all progress
 */
export function resetAllProgress(state: MasteryState): MasteryState {
  const newState = {
    studentId: state.studentId,
    topics: new Map<string, TopicProgress>(),
  };

  // Auto-save to database (fire and forget)
  void saveMasteryState(newState);

  return newState;
}

