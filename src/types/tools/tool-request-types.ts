// ============================================================================
// TOOL REQUEST TYPES - Request structures for tool creation
// ============================================================================

import type { Subject } from '../content';
import type { QuestionType } from '../education';

/**
 * Request to create a quiz
 */
export interface QuizRequest {
  title: string;
  subject: Subject;
  questions: Array<{
    text: string;
    type: QuestionType;
    options?: string[];
    correctAnswer: string | number;
    hints: string[];
    explanation: string;
    difficulty: 1 | 2 | 3 | 4 | 5;
    topic: string;
  }>;
  masteryThreshold?: number;
  xpReward?: number;
}

/**
 * Request to create a flashcard deck
 */
export interface FlashcardDeckRequest {
  name: string;
  subject: Subject;
  cards: Array<{
    front: string;
    back: string;
  }>;
}

/**
 * Request to create a mindmap
 */
export interface MindmapRequest {
  title: string;
  nodes: Array<{
    id: string;
    label: string;
    children?: Array<{
      id: string;
      label: string;
      children?: Array<{
        id: string;
        label: string;
      }>;
    }>;
  }>;
}

/**
 * Request to create a diagram
 */
export interface DiagramRequest {
  type: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'mindmap';
  code: string; // Mermaid syntax
  title?: string;
}

/**
 * Request to create a chart
 */
export interface ChartRequest {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  title: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      color?: string;
    }>;
  };
}

/**
 * Request to render a formula
 */
export interface FormulaRequest {
  latex: string;
  description?: string;
}

/**
 * Request to execute code
 */
export interface CodeExecutionRequest {
  language: 'python' | 'javascript';
  code: string;
  timeout?: number;
}

/**
 * Request to create a visualization
 */
export interface VisualizationRequest {
  type: 'physics' | 'math' | 'chemistry' | 'biology';
  name: string;
  params: Record<string, number | string>;
}
