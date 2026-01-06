import type { AccessibilitySettings } from '@/lib/accessibility/accessibility-store';
import type {
  MindmapNode,
  FlashcardItem,
  SummaryData,
  QuizData,
  TimelineData,
} from '@/types/tools';

export type PrintableContentType =
  | 'mindmap'
  | 'flashcard'
  | 'summary'
  | 'quiz'
  | 'diagram'
  | 'timeline'
  | 'search'
  | 'demo'
  | 'formula'
  | 'chart';

export interface PrintOptions {
  title: string;
  contentType: PrintableContentType;
  content: unknown;
  accessibility: Partial<AccessibilitySettings>;
  showDate?: boolean;
  showWatermark?: boolean;
}

export interface DiagramPrintData {
  topic: string;
  diagramType?: string;
  mermaidCode?: string;
}

export type { MindmapNode, FlashcardItem, SummaryData, QuizData, TimelineData };

