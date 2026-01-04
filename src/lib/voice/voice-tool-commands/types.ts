/**
 * Voice Tool Commands - Core Type Definitions
 *
 * Core type definitions for Azure Realtime API voice tools.
 *
 * Part of I-02: Voice Tool Commands
 * Related: #25 Voice-First Tool Creation
 */

import type { ToolType } from '@/lib/realtime/tool-events';
import type { Subject } from '@/types';

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Voice tool definition for Azure Realtime API.
 */
export interface VoiceToolDefinition {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

/**
 * Voice tool call result.
 */
export interface VoiceToolCallResult {
  success: boolean;
  toolId?: string;
  toolType?: ToolType;
  error?: string;
  displayed?: boolean;
}

// ============================================================================
// EDUCATIONAL TOOL ARGUMENTS
// ============================================================================

/**
 * Arguments for create_mindmap tool.
 */
export interface CreateMindmapArgs {
  title: string;
  topic: string;
  subject?: Subject;
  nodes?: Array<{
    id: string;
    label: string;
    parentId?: string;
  }>;
}

/**
 * Arguments for create_quiz tool.
 */
export interface CreateQuizArgs {
  title: string;
  subject: Subject;
  topic?: string;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  questions?: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
}

/**
 * Arguments for create_flashcards tool.
 */
export interface CreateFlashcardsArgs {
  name: string;
  subject: Subject;
  topic?: string;
  cardCount?: number;
  cards?: Array<{
    front: string;
    back: string;
    hint?: string;
  }>;
}

/**
 * Arguments for create_summary tool (legacy AI-generated).
 */
export interface CreateSummaryArgs {
  title: string;
  subject?: Subject;
  topic: string;
  length?: 'short' | 'medium' | 'long';
}

/**
 * Arguments for open_student_summary tool (maieutic method).
 * Student writes their own summary with AI guidance.
 */
export interface OpenStudentSummaryArgs {
  topic: string;
}

/**
 * Arguments for student_summary_add_comment tool.
 * Maestro adds inline feedback to student's text.
 */
export interface StudentSummaryAddCommentArgs {
  sectionId: 'intro' | 'main' | 'conclusion';
  startOffset: number;
  endOffset: number;
  text: string;
}

/**
 * Arguments for create_diagram tool.
 */
export interface CreateDiagramArgs {
  title: string;
  type: 'flowchart' | 'sequence' | 'class' | 'er';
  topic: string;
  subject?: Subject;
}

/**
 * Arguments for create_timeline tool.
 */
export interface CreateTimelineArgs {
  title: string;
  subject?: Subject;
  period: string;
  events?: Array<{
    date: string;
    title: string;
    description: string;
  }>;
}

/**
 * Arguments for create_demo tool.
 */
export interface CreateDemoArgs {
  title: string;
  description?: string;
  html: string;
  css?: string;
  js?: string;
}

/**
 * Arguments for web_search tool.
 */
export interface WebSearchArgs {
  query: string;
}

/**
 * Arguments for capture_homework tool.
 */
export interface CaptureHomeworkArgs {
  purpose: string;
  instructions?: string;
}
