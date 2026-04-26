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
    id: string;
    heading: string;
    content: string;
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
  type: 'flowchart' | 'sequence' | 'class' | 'er';
  mermaidCode: string;
}

// Union type for all tool content
export type ToolContent =
  | MindmapContent
  | FlashcardContent
  | QuizContent
  | SummaryContent
  | TimelineContent
  | DiagramContent;

// Tool state structure
export interface ToolState {
  id: string;
  type: string;
  status: ToolStatus;
  sessionId: string;
  maestroId: string;
  title: string;
  subject?: string;
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
  progress: number;
  chunksReceived: number;
  content: Partial<ToolContent>;
  rawChunks?: string[];
  error?: string;
  errorMessage?: string;
}
