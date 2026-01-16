// ============================================================================
// EDUCATIONAL TOOL DATA TYPES
// Mindmap, Quiz, Demo, Summary, Diagram, Timeline
// ============================================================================

export interface MindmapNode {
  id: string;
  label: string;
  parentId?: string | null;
  children?: MindmapNode[];
}

export interface MindmapData {
  title: string; // ADR 0020: Standardized on 'title' (was 'topic')
  topic?: string; // Deprecated: for backward compatibility
  nodes: MindmapNode[];
  markdown?: string;
}

// ============================================================================
// Quiz specific types
// ============================================================================

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

export interface QuizData {
  topic: string;
  questions: QuizQuestion[];
}

// ============================================================================
// Demo specific types
// ============================================================================

export interface DemoData {
  title: string;
  description?: string;
  html: string;
  css?: string;
  js?: string;
}

// ============================================================================
// Summary specific types
// ============================================================================

export interface SummarySection {
  title: string;
  content: string;
  keyPoints?: string[];
}

export interface SummaryData {
  topic: string;
  sections: SummarySection[];
  length?: 'short' | 'medium' | 'long';
}

// ============================================================================
// Diagram specific types
// ============================================================================

export interface DiagramData {
  topic: string;
  diagramType: 'flowchart' | 'sequence' | 'class' | 'er';
  mermaidCode: string;
}

// ============================================================================
// Timeline specific types
// ============================================================================

export interface TimelineEvent {
  date: string;
  title: string;
  description?: string;
}

export interface TimelineData {
  topic: string;
  period?: string;
  events: TimelineEvent[];
}

// ============================================================================
// Flashcard specific types
// ============================================================================

export interface FlashcardItem {
  front: string;
  back: string;
}

export interface FlashcardData {
  topic: string;
  cards: FlashcardItem[];
}
