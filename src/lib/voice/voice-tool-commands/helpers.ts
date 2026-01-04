/**
 * Voice Tool Commands - Helper Functions
 *
 * Utility functions for identifying and categorizing voice tool commands.
 *
 * Part of I-02: Voice Tool Commands
 * Related: #25 Voice-First Tool Creation
 */

import type { ToolType } from '@/lib/realtime/tool-events';

// ============================================================================
// MINDMAP MODIFICATION HELPERS
// ============================================================================

/**
 * List of mindmap modification command names.
 */
const MINDMAP_MODIFICATION_COMMANDS = [
  'mindmap_add_node',
  'mindmap_connect_nodes',
  'mindmap_expand_node',
  'mindmap_delete_node',
  'mindmap_focus_node',
  'mindmap_set_color',
] as const;

/**
 * Check if a tool name is a mindmap modification command.
 */
export function isMindmapModificationCommand(name: string): boolean {
  return MINDMAP_MODIFICATION_COMMANDS.includes(name as typeof MINDMAP_MODIFICATION_COMMANDS[number]);
}

// ============================================================================
// SUMMARY MODIFICATION HELPERS
// ============================================================================

/**
 * List of summary modification command names.
 */
const SUMMARY_MODIFICATION_COMMANDS = [
  'summary_set_title',
  'summary_add_section',
  'summary_add_point',
  'summary_finalize',
  'student_summary_add_comment',
] as const;

/**
 * Check if a tool name is a summary modification command.
 */
export function isSummaryModificationCommand(name: string): boolean {
  return SUMMARY_MODIFICATION_COMMANDS.includes(name as typeof SUMMARY_MODIFICATION_COMMANDS[number]);
}

// ============================================================================
// ONBOARDING HELPERS
// ============================================================================

/**
 * List of onboarding command names.
 */
const ONBOARDING_COMMANDS = [
  'set_student_name',
  'set_student_age',
  'set_school_level',
  'set_learning_differences',
  'set_student_gender',
  'confirm_step_data',
  'next_onboarding_step',
  'prev_onboarding_step',
] as const;

/**
 * Check if a tool name is an onboarding command.
 */
export function isOnboardingCommand(name: string): boolean {
  return ONBOARDING_COMMANDS.includes(name as typeof ONBOARDING_COMMANDS[number]);
}

// ============================================================================
// TOOL TYPE MAPPING
// ============================================================================

/**
 * Maps voice tool names to ToolType.
 */
export function getToolTypeFromName(name: string): ToolType | null {
  switch (name) {
    case 'create_mindmap':
      return 'mindmap';
    case 'create_quiz':
      return 'quiz';
    case 'create_flashcards':
      return 'flashcards';
    case 'create_summary':
    case 'open_student_summary':
      return 'summary';
    case 'create_diagram':
      return 'diagram';
    case 'create_timeline':
      return 'timeline';
    case 'create_demo':
      return 'demo';
    default:
      return null;
  }
}

/**
 * Check if a tool name is a tool creation command.
 */
export function isToolCreationCommand(name: string): boolean {
  return getToolTypeFromName(name) !== null;
}

/**
 * Generate a tool ID for a voice command.
 */
export function generateToolId(): string {
  return `voice-tool-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}
