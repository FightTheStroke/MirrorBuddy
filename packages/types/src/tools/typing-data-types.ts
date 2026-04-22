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
