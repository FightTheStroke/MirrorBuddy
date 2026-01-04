/**
 * Voice Tool Commands - Modifier Type Definitions
 *
 * Type definitions for modification commands and onboarding tools.
 *
 * Part of I-02: Voice Tool Commands
 * Related: Phase 7 (Voice Commands), #61 (Onboarding Voice Integration)
 */

// ============================================================================
// MINDMAP MODIFICATION ARGUMENTS
// ============================================================================

/** Arguments for mindmap_add_node tool. */
export interface MindmapAddNodeArgs {
  concept: string;
  parentNode?: string;
}

/** Arguments for mindmap_connect_nodes tool. */
export interface MindmapConnectNodesArgs {
  nodeA: string;
  nodeB: string;
}

/** Arguments for mindmap_expand_node tool. */
export interface MindmapExpandNodeArgs {
  node: string;
  suggestions?: string[];
}

/** Arguments for mindmap_delete_node tool. */
export interface MindmapDeleteNodeArgs {
  node: string;
}

/** Arguments for mindmap_focus_node tool. */
export interface MindmapFocusNodeArgs {
  node: string;
}

/** Arguments for mindmap_set_color tool. */
export interface MindmapSetColorArgs {
  node: string;
  color: string;
}

// ============================================================================
// ONBOARDING ARGUMENTS
// ============================================================================

/** Arguments for set_student_name tool. */
export interface SetStudentNameArgs {
  name: string;
}

/** Arguments for set_student_age tool. */
export interface SetStudentAgeArgs {
  age: number;
}

/** Arguments for set_school_level tool. */
export interface SetSchoolLevelArgs {
  level: 'elementare' | 'media' | 'superiore';
}

/** Arguments for set_learning_differences tool. */
export interface SetLearningDifferencesArgs {
  differences: string[];
}

/** Arguments for set_student_gender tool. */
export interface SetStudentGenderArgs {
  gender: 'male' | 'female' | 'other';
}

// ============================================================================
// VOICE TOOL ARGS UNION
// ============================================================================

import type {
  CreateMindmapArgs,
  CreateQuizArgs,
  CreateFlashcardsArgs,
  CreateSummaryArgs,
  CreateDiagramArgs,
  CreateTimelineArgs,
  CreateDemoArgs,
  WebSearchArgs,
  CaptureHomeworkArgs,
} from './types';

/**
 * Union of all tool arguments.
 */
export type VoiceToolArgs =
  | { name: 'create_mindmap'; args: CreateMindmapArgs }
  | { name: 'create_quiz'; args: CreateQuizArgs }
  | { name: 'create_flashcards'; args: CreateFlashcardsArgs }
  | { name: 'create_summary'; args: CreateSummaryArgs }
  | { name: 'create_diagram'; args: CreateDiagramArgs }
  | { name: 'create_timeline'; args: CreateTimelineArgs }
  | { name: 'create_demo'; args: CreateDemoArgs }
  | { name: 'web_search'; args: WebSearchArgs }
  | { name: 'capture_homework'; args: CaptureHomeworkArgs }
  // Mindmap modification commands
  | { name: 'mindmap_add_node'; args: MindmapAddNodeArgs }
  | { name: 'mindmap_connect_nodes'; args: MindmapConnectNodesArgs }
  | { name: 'mindmap_expand_node'; args: MindmapExpandNodeArgs }
  | { name: 'mindmap_delete_node'; args: MindmapDeleteNodeArgs }
  | { name: 'mindmap_focus_node'; args: MindmapFocusNodeArgs }
  | { name: 'mindmap_set_color'; args: MindmapSetColorArgs }
  // Onboarding tools
  | { name: 'set_student_name'; args: SetStudentNameArgs }
  | { name: 'set_student_age'; args: SetStudentAgeArgs }
  | { name: 'set_school_level'; args: SetSchoolLevelArgs }
  | { name: 'set_learning_differences'; args: SetLearningDifferencesArgs }
  | { name: 'set_student_gender'; args: SetStudentGenderArgs }
  | { name: 'confirm_step_data'; args: Record<string, never> }
  | { name: 'next_onboarding_step'; args: Record<string, never> }
  | { name: 'prev_onboarding_step'; args: Record<string, never> };
