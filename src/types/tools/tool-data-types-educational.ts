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

// ============================================================================
// Typing Tutor specific types
// ============================================================================

export type KeyboardLayout = 'qwertz' | 'qwerty' | 'azerty' | 'dvorak';

export type TypingHandMode = 'both' | 'left-only' | 'right-only';

export type TypingLevel = 'beginner' | 'intermediate' | 'advanced';

export interface KeyConfig {
  key: string;
  code: string;
  shiftKey?: string;
  finger?: 'pinky' | 'ring' | 'middle' | 'index' | 'thumb';
  hand?: 'left' | 'right';
}

export interface KeyboardLayoutConfig {
  name: KeyboardLayout;
  label: string;
  rows: KeyConfig[][];
}

export interface LessonKey {
  key: string;
  correct: boolean;
  expected: string;
  actual?: string;
  timestamp: number;
}

export interface TypingLesson {
  id: string;
  level: TypingLevel;
  title: string;
  description: string;
  text: string;
  targetWPM?: number;
  unlocked: boolean;
  completed: boolean;
  order: number;
}

export interface LessonResult {
  lessonId: string;
  duration: number;
  correctKeystrokes: number;
  totalKeystrokes: number;
  accuracy: number;
  wpm: number;
  completed: boolean;
  timestamp: Date;
}

export interface TypingProgress {
  userId: string;
  currentLevel: TypingLevel;
  keyboardLayout: KeyboardLayout;
  handMode: TypingHandMode;
  lessons: Map<string, LessonResult>;
  stats: TypingStats;
  lastPlayed?: Date;
}

export interface TypingStats {
  totalLessonsCompleted: number;
  totalKeystrokes: number;
  totalAccuracy: number;
  bestWPM: number;
  averageWPM: number;
  streakDays: number;
  lastStreakDate?: Date;
  points: number;
  badges: string[];
}
