// ============================================================================
// TOOL EXECUTOR MAPPING
// Function name to tool type mappings
// ============================================================================

import type { ToolType } from '@/types/tools';

/**
 * Map function names to tool types
 */
export function getToolTypeFromFunctionName(functionName: string): ToolType {
  const mapping: Record<string, ToolType> = {
    create_mindmap: 'mindmap',
    create_quiz: 'quiz',
    create_demo: 'demo',
    web_search: 'search',
    create_flashcards: 'flashcard',
    create_diagram: 'diagram',
    create_timeline: 'timeline',
    create_summary: 'summary',
    open_student_summary: 'summary',
    student_summary_add_comment: 'summary',
    create_formula: 'formula',
    create_chart: 'chart',
    create_calculator: 'calculator',
    homework_help: 'homework',
    upload_pdf: 'pdf',
    capture_webcam: 'webcam',
    study_kit: 'study-kit',
  };
  return mapping[functionName] || 'mindmap';
}
