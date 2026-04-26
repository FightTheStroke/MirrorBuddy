/**
 * @file types.ts
 * @brief Types for saved materials
 */

import type { ToolType } from '@/types/tools';
import type { Subject } from '@/types';

export interface SavedMaterial {
  id: string;
  toolId: string;
  toolType: ToolType;
  title: string;
  content: Record<string, unknown>;
  maestroId?: string;
  sessionId?: string;
  subject?: string;
  preview?: string;
  status: 'active' | 'archived' | 'deleted';
  userRating?: number;
  isBookmarked: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MindmapNode {
  id: string;
  label: string;
  children?: MindmapNode[];
  icon?: string;
  color?: string;
}

export interface SavedMindmap {
  id: string;
  title: string;
  nodes: MindmapNode[];
  markdown?: string;
  subject: Subject;
  createdAt: Date;
  maestroId?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface SavedQuiz {
  id: string;
  title: string;
  subject: string;
  questions: QuizQuestion[];
  createdAt: Date;
}

export interface FlashcardCard {
  front: string;
  back: string;
}

export interface SavedFlashcardDeck {
  id: string;
  name: string;
  subject: string;
  cards: FlashcardCard[];
  createdAt: Date;
}

export interface HomeworkStep {
  id: string;
  description: string;
  hints: string[];
  studentNotes: string;
  completed: boolean;
}

export interface SavedHomework {
  id: string;
  title: string;
  subject: Subject;
  problemType: string;
  photoUrl?: string;
  steps: HomeworkStep[];
  createdAt: Date;
  completedAt?: Date;
}

export interface SavedDemo {
  id: string;
  title: string;
  description?: string;
  code: string;
  subject?: string;
  maestroId?: string;
  tags: string[];
  createdAt: Date;
}

