// ============================================================================
// TOOL EXECUTOR SCHEMAS
// Zod validation schemas for all tool arguments
// ============================================================================

import { z } from 'zod';

/**
 * Zod validation schemas for tool arguments
 * Ensures type safety and graceful error handling for tool inputs
 */
export const TOOL_SCHEMAS = {
  create_mindmap: z.object({
    title: z.string().min(1, 'Title is required'),
    nodes: z.array(z.object({
      id: z.string(),
      label: z.string(),
      parentId: z.string().optional(),
    })).min(1, 'At least one node is required'),
  }),
  create_quiz: z.object({
    topic: z.string().min(1, 'Topic is required'),
    difficulty: z.number().min(1).max(5).optional(),
    questions: z.array(z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string().optional(),
      difficulty: z.number().min(1).max(5).optional(),
    })).min(1, 'At least one question is required'),
  }),
  create_flashcards: z.object({
    topic: z.string().min(1, 'Topic is required'),
    cards: z.array(z.object({
      front: z.string(),
      back: z.string(),
    })).min(1, 'At least one card is required'),
  }),
  create_demo: z.object({
    title: z.string().min(1, 'Title is required'),
    concept: z.string().min(1, 'Concept is required'),
    visualization: z.string().min(1, 'Visualization is required'),
    interaction: z.string().min(1, 'Interaction is required'),
    wowFactor: z.string().optional(),
  }),
  create_summary: z.object({
    topic: z.string().min(1, 'Topic is required'),
    sections: z.array(z.object({
      title: z.string(),
      content: z.string(),
      keyPoints: z.array(z.string()).optional(),
    })).min(1, 'At least one section is required'),
  }),
  web_search: z.object({
    query: z.string().min(1, 'Query is required'),
    type: z.enum(['web', 'youtube', 'all']).optional(),
  }),
  open_student_summary: z.object({
    topic: z.string().min(1, 'Topic is required'),
  }),
  student_summary_add_comment: z.object({
    sectionId: z.enum(['intro', 'main', 'conclusion']),
    startOffset: z.number(),
    endOffset: z.number(),
    text: z.string().min(1, 'Comment text is required'),
  }),
  create_diagram: z.object({
    topic: z.string().min(1, 'Topic is required'),
    diagramType: z.enum(['flowchart', 'sequence', 'class', 'er']),
    mermaidCode: z.string().min(1, 'Mermaid code is required'),
  }),
  create_timeline: z.object({
    topic: z.string().min(1, 'Topic is required'),
    period: z.string().optional(),
    events: z.array(z.object({
      date: z.string(),
      title: z.string(),
      description: z.string().optional(),
    })).min(1, 'At least one event is required'),
  }),
  create_formula: z.object({
    latex: z.string().optional(),
    description: z.string().optional(),
  }).refine(
    (data) => data.latex || data.description,
    { message: 'Either latex or description is required' }
  ),
  search_archive: z.object({
    query: z.string().optional(),
    toolType: z.enum(['mindmap', 'quiz', 'flashcard', 'summary', 'demo', 'homework', 'diagram', 'timeline']).optional(),
    subject: z.string().optional(),
  }),
  homework_help: z.object({
    fileData: z.union([z.string(), z.instanceof(ArrayBuffer)]).optional(),
    fileType: z.enum(['pdf', 'image']).optional(),
    text: z.string().optional(),
  }).refine(
    (data) => data.text || (data.fileData && data.fileType),
    { message: 'Either text or fileData with fileType is required' }
  ),
} as const;

/**
 * Get validation schema for a tool (if one exists)
 */
export function getToolSchema(
  functionName: string
): z.ZodSchema | undefined {
  return TOOL_SCHEMAS[functionName as keyof typeof TOOL_SCHEMAS];
}
