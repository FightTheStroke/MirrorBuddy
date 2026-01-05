// ============================================================================
// LEARNING PATH TYPES
// Progressive learning path structures for Plan 8 MVP
// ============================================================================

/**
 * Status of a topic within a learning path
 */
export type TopicStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';

/**
 * Type of step within a topic
 */
export type TopicStepType = 'overview' | 'mindmap' | 'flashcard' | 'quiz';

/**
 * Difficulty level for topics
 */
export type TopicDifficulty = 'basic' | 'intermediate' | 'advanced';

/**
 * Step content types based on step type
 */
export interface OverviewContent {
  text: string;
  mermaidCode?: string;
}

export interface MindmapContent {
  nodes: Array<{ id: string; label: string; parentId?: string }>;
  svgData?: string;
}

export interface FlashcardContent {
  cards: Array<{ front: string; back: string }>;
}

export interface QuizContent {
  questions: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
}

export type StepContent = OverviewContent | MindmapContent | FlashcardContent | QuizContent;

/**
 * A single step within a topic (overview, mindmap, flashcard set, or quiz)
 */
export interface TopicStep {
  id: string;
  topicId: string;
  order: number;
  type: TopicStepType;
  title: string;
  content: StepContent;
  isCompleted: boolean;
  completedAt?: Date;
}

/**
 * A topic within a learning path
 */
export interface LearningPathTopic {
  id: string;
  pathId: string;
  order: number;
  title: string;
  description: string;
  keyConcepts: string[];
  difficulty: TopicDifficulty;
  status: TopicStatus;
  steps: TopicStep[];
  estimatedMinutes: number;
  startedAt?: Date;
  completedAt?: Date;
  quizScore?: number; // Last quiz score for this topic (0-100)
}

/**
 * A complete learning path generated from a PDF
 */
export interface LearningPath {
  id: string;
  userId: string;
  title: string;
  description?: string;
  subject?: string;
  sourceStudyKitId?: string; // Link to original PDF upload
  topics: LearningPathTopic[];
  totalTopics: number;
  completedTopics: number;
  progressPercent: number;
  estimatedTotalMinutes: number;
  status: 'generating' | 'ready' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * Progress update for a topic
 */
export interface TopicProgressUpdate {
  topicId: string;
  status?: TopicStatus;
  stepId?: string;
  stepCompleted?: boolean;
  quizScore?: number;
}

/**
 * Summary of learning path progress
 */
export interface LearningPathProgress {
  pathId: string;
  totalTopics: number;
  completedTopics: number;
  currentTopicId?: string;
  progressPercent: number;
  averageQuizScore?: number;
  totalTimeSpentMinutes: number;
  lastActivityAt?: Date;
}
