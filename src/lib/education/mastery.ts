/**
 * CONVERGIO EDUCATION - MASTERY LEARNING
 *
 * TypeScript implementation of mastery learning system inspired by Khan Academy.
 * Tracks skill mastery, detects gaps, and provides learning path recommendations.
 *
 * Key Concepts:
 * - Skill mastery: 80%+ correct = mastered
 * - Skill tree: Prerequisites must be mastered before advancing
 * - Adaptive difficulty: Adjusts based on performance
 * - Persistent state: Saves to localStorage
 *
 * Copyright (c) 2025 Convergio.io
 * Licensed under MIT License
 */

import { logger } from '@/lib/logger';

// ============================================================================
// CONSTANTS
// ============================================================================

const MASTERY_THRESHOLD = 0.80; // 80% = mastered
const PROFICIENT_THRESHOLD = 0.60; // 60% = proficient
const FAMILIAR_THRESHOLD = 0.40; // 40% = familiar
const ATTEMPTS_FOR_MASTERY = 5; // Minimum attempts needed

// Difficulty adjustment factors
const DIFFICULTY_INCREASE = 1.15;
const DIFFICULTY_DECREASE = 0.85;
const MIN_DIFFICULTY = 0.5;
const MAX_DIFFICULTY = 2.0;

// ============================================================================
// TYPES
// ============================================================================

export enum SkillStatus {
  NOT_STARTED = "not_started",
  ATTEMPTED = "attempted",
  FAMILIAR = "familiar",
  PROFICIENT = "proficient",
  MASTERED = "mastered",
}

export interface Topic {
  id: string;
  name: string;
  prerequisites: string[]; // topic IDs that must be mastered first
  subject?: string;
  gradeLevel?: number;
  description?: string;
}

export interface TopicProgress {
  topicId: string;
  totalQuestions: number;
  correctAnswers: number;
  masteryLevel: number; // 0-100 (percentage)
  isMastered: boolean; // >= 80%
  attempts: number;
  lastAttempt: Date;
  currentDifficulty: number; // Adaptive difficulty 0.5-2.0
  status: SkillStatus;
  masteredAt?: Date;
}

export interface MasteryState {
  topics: Map<string, TopicProgress>;
  studentId?: string;
}

export interface MasteryStats {
  totalTopics: number;
  masteredCount: number;
  proficientCount: number;
  inProgressCount: number;
  notStartedCount: number;
  averageMastery: number;
  totalAttempts: number;
  totalCorrect: number;
  accuracy: number;
}

// ============================================================================
// PERSISTENCE
// ============================================================================

const STORAGE_KEY = "convergio_mastery_state";

/**
 * Save mastery state to localStorage
 */
export function saveMasteryState(state: MasteryState): void {
  try {
    const serialized = {
      studentId: state.studentId,
      topics: Array.from(state.topics.entries()).map(([id, progress]) => ({
        id,
        ...progress,
        lastAttempt: progress.lastAttempt.toISOString(),
        masteredAt: progress.masteredAt?.toISOString(),
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (error) {
    logger.error('[Mastery] Failed to save state', { error: String(error) });
  }
}

/**
 * Load mastery state from localStorage
 */
export function loadMasteryState(): MasteryState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { topics: new Map() };
    }

    const parsed = JSON.parse(stored);
    const topics = new Map<string, TopicProgress>();

    for (const item of parsed.topics || []) {
      topics.set(item.id, {
        ...item,
        lastAttempt: new Date(item.lastAttempt),
        masteredAt: item.masteredAt ? new Date(item.masteredAt) : undefined,
      });
    }

    return {
      studentId: parsed.studentId,
      topics,
    };
  } catch (error) {
    logger.error('[Mastery] Failed to load state', { error: String(error) });
    return { topics: new Map() };
  }
}

/**
 * Clear all mastery data
 */
export function clearMasteryState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================================
// MASTERY CALCULATION
// ============================================================================

/**
 * Calculate mastery level from attempts and correct answers
 * Uses weighted average favoring recent attempts
 */
function calculateMastery(
  attempts: number,
  correct: number,
  prevMastery: number
): number {
  if (attempts <= 0) return 0;

  // Simple ratio for new skills
  const simpleRatio = correct / attempts;

  // Weighted average with previous mastery (momentum)
  const weight = Math.min(attempts / ATTEMPTS_FOR_MASTERY, 1.0);
  const mastery = weight * simpleRatio + (1.0 - weight) * prevMastery;

  return Math.max(0, Math.min(1.0, mastery));
}

/**
 * Determine skill status from mastery level
 */
function statusFromMastery(mastery: number, attempts: number): SkillStatus {
  if (attempts < ATTEMPTS_FOR_MASTERY && mastery < MASTERY_THRESHOLD) {
    return SkillStatus.ATTEMPTED;
  }
  if (mastery >= MASTERY_THRESHOLD) return SkillStatus.MASTERED;
  if (mastery >= PROFICIENT_THRESHOLD) return SkillStatus.PROFICIENT;
  if (mastery >= FAMILIAR_THRESHOLD) return SkillStatus.FAMILIAR;
  if (attempts > 0) return SkillStatus.ATTEMPTED;
  return SkillStatus.NOT_STARTED;
}

/**
 * Adjust difficulty based on performance
 */
function adjustDifficulty(currentDifficulty: number, wasCorrect: boolean): number {
  let newDifficulty = currentDifficulty;

  if (wasCorrect) {
    newDifficulty *= DIFFICULTY_INCREASE;
  } else {
    newDifficulty *= DIFFICULTY_DECREASE;
  }

  return Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, newDifficulty));
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

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

  // Auto-save to localStorage
  saveMasteryState(newState);

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

/**
 * Reset a topic's progress
 */
export function resetTopic(state: MasteryState, topicId: string): MasteryState {
  const newState = { ...state };
  const topics = new Map(state.topics);

  topics.delete(topicId);
  newState.topics = topics;

  // Auto-save to localStorage
  saveMasteryState(newState);

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

  // Auto-save to localStorage
  saveMasteryState(newState);

  return newState;
}

// ============================================================================
// STATISTICS
// ============================================================================

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

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Get status label for display
 */
export function getStatusLabel(status: SkillStatus): string {
  switch (status) {
    case SkillStatus.MASTERED:
      return "Mastered";
    case SkillStatus.PROFICIENT:
      return "Proficient";
    case SkillStatus.FAMILIAR:
      return "Familiar";
    case SkillStatus.ATTEMPTED:
      return "In Progress";
    case SkillStatus.NOT_STARTED:
      return "Not Started";
    default:
      return "Unknown";
  }
}

/**
 * Get status emoji for display
 */
export function getStatusEmoji(status: SkillStatus): string {
  switch (status) {
    case SkillStatus.MASTERED:
      return "✅";
    case SkillStatus.PROFICIENT:
      return "🟢";
    case SkillStatus.FAMILIAR:
      return "🟡";
    case SkillStatus.ATTEMPTED:
      return "🟠";
    case SkillStatus.NOT_STARTED:
      return "⚪";
    default:
      return "❓";
  }
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: SkillStatus): string {
  switch (status) {
    case SkillStatus.MASTERED:
      return "#22c55e"; // green-500
    case SkillStatus.PROFICIENT:
      return "#84cc16"; // lime-500
    case SkillStatus.FAMILIAR:
      return "#eab308"; // yellow-500
    case SkillStatus.ATTEMPTED:
      return "#f97316"; // orange-500
    case SkillStatus.NOT_STARTED:
      return "#94a3b8"; // slate-400
    default:
      return "#64748b"; // slate-500
  }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example: Create a simple math curriculum
 */
export function createExampleCurriculum(): Topic[] {
  return [
    {
      id: "math.arithmetic.addition",
      name: "Addition",
      prerequisites: [],
      subject: "math",
      gradeLevel: 1,
    },
    {
      id: "math.arithmetic.subtraction",
      name: "Subtraction",
      prerequisites: ["math.arithmetic.addition"],
      subject: "math",
      gradeLevel: 1,
    },
    {
      id: "math.arithmetic.multiplication",
      name: "Multiplication",
      prerequisites: ["math.arithmetic.addition"],
      subject: "math",
      gradeLevel: 2,
    },
    {
      id: "math.arithmetic.division",
      name: "Division",
      prerequisites: ["math.arithmetic.multiplication"],
      subject: "math",
      gradeLevel: 3,
    },
    {
      id: "math.fractions.basics",
      name: "Fractions Basics",
      prerequisites: ["math.arithmetic.division"],
      subject: "math",
      gradeLevel: 3,
    },
    {
      id: "math.fractions.addition",
      name: "Adding Fractions",
      prerequisites: ["math.fractions.basics"],
      subject: "math",
      gradeLevel: 4,
    },
  ];
}
