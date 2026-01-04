// ============================================================================
// EDUCATION TYPES - Questions, Quizzes, Flashcards, Homework
// ============================================================================

import type { Subject } from './content';

// === QUIZ TYPES ===

export type QuestionType = 'multiple_choice' | 'true_false' | 'open_ended';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string | number;
  hints: string[];
  explanation: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  subject: Subject;
  topic: string;
}

export interface Quiz {
  id: string;
  title: string;
  subject: Subject;
  questions: Question[];
  timeLimit?: number; // seconds
  masteryThreshold: number; // 0-100
  xpReward: number;
}

export interface QuizResult {
  quizId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  masteryAchieved: boolean;
  xpEarned: number;
  completedAt: Date;
}

// === FLASHCARD TYPES (FSRS-5) ===

export type CardState = 'new' | 'learning' | 'review' | 'relearning';
export type Rating = 'again' | 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  state: CardState;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  lastReview?: Date;
  nextReview: Date;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  subject: Subject;
  cards: Flashcard[];
  createdAt: Date;
  lastStudied?: Date;
}

// === HOMEWORK TYPES ===

export interface HomeworkStep {
  id: string;
  description: string;
  hints: string[]; // 3 progressive hints
  studentNotes: string;
  completed: boolean;
}

export interface Homework {
  id: string;
  title: string;
  subject: Subject;
  problemType: string;
  steps: HomeworkStep[];
  photoUrl?: string;
  createdAt: Date;
  completedAt?: Date;
}
