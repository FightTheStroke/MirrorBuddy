/**
 * @file types.ts
 * @brief Types and interfaces for mastery learning
 */

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

