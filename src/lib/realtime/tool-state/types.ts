/**
 * Types for Tool State Management
 */

// Tool creation status
export type ToolStatus =
  | 'initializing'   // Tool just started
  | 'building'       // Actively being built
  | 'paused'         // Temporarily paused
  | 'completed'      // Successfully finished
  | 'error'          // Failed with error
  | 'cancelled';   // User cancelled

// Base content types for different tools
export interface MindmapContent {
  centralTopic: string;
  nodes: Array<{
    id: string;
    label: string;
    parentId: string | null;
    color?: string;
  }>;
}

export interface FlashcardContent {
  cards: Array<{
    id: string;
    front: string;
    back: string;
    hint?: string;
  }>;
}

export interface QuizContent {
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
}

export interface SummaryContent {
  sections: Array<{
    title: string;
    content: string;
    keyPoints?: string[];
  }>;
}

export interface TimelineContent {
  events: Array<{
    id: string;
    date: string;
    title: string;
    description: string;
  }>;
}

export interface DiagramContent {
  nodes: Array<{ id: string; label: string; x: number; y: number }>;
  edges: Array<{ from: string; to: string }>;
}

export type ToolContent =
  | { type: 'mindmap'; data: MindmapContent }
  | { type: 'flashcard'; data: FlashcardContent }
  | { type: 'quiz'; data: QuizContent }
  | { type: 'summary'; data: SummaryContent }
  | { type: 'timeline'; data: TimelineContent }
  | { type: 'diagram'; data: DiagramContent };

export interface ToolState {
  id: string;
  type: string;
  status: ToolStatus;
  content: ToolContent | null;
  progress: number; // 0-100
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  maestroId?: string;
  sessionId?: string;
}
