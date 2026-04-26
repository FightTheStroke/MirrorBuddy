// ============================================================================
// SUMMARY HANDLER
// Creates structured summaries with sections and key points
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { nanoid } from 'nanoid';
import type { SummaryData, SummarySection, ToolExecutionResult } from '@/types/tools';
import { createEmptyStudentSummary } from '@/types/tools';

/**
 * Validate summary sections structure
 */
function validateSections(
  sections: unknown[]
): { valid: boolean; error?: string } {
  if (!sections || sections.length === 0) {
    return { valid: false, error: 'At least one section is required' };
  }

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i] as Partial<SummarySection>;

    if (!s.title || typeof s.title !== 'string') {
      return {
        valid: false,
        error: `Section ${i + 1}: title is required`,
      };
    }

    if (!s.content || typeof s.content !== 'string') {
      return {
        valid: false,
        error: `Section ${i + 1}: content is required`,
      };
    }

    if (s.keyPoints && !Array.isArray(s.keyPoints)) {
      return {
        valid: false,
        error: `Section ${i + 1}: keyPoints must be an array`,
      };
    }
  }

  return { valid: true };
}

/**
 * Register the summary handler
 */
registerToolHandler('create_summary', async (args): Promise<ToolExecutionResult> => {
  const { topic, sections, length } = args as {
    topic: string;
    sections: Array<{
      title: string;
      content: string;
      keyPoints?: string[];
    }>;
    length?: 'short' | 'medium' | 'long';
  };

  // Validate topic
  if (!topic || typeof topic !== 'string') {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'summary',
      error: 'Topic is required and must be a string',
    };
  }

  // Validate sections
  const validation = validateSections(sections);
  if (!validation.valid) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'summary',
      error: validation.error,
    };
  }

  // Normalize sections structure
  const normalizedSections: SummarySection[] = sections.map((s) => ({
    title: s.title.trim(),
    content: s.content.trim(),
    keyPoints: s.keyPoints?.map((p) => p.trim()),
  }));

  const data: SummaryData = {
    topic: topic.trim(),
    sections: normalizedSections,
    length,
  };

  return {
    success: true,
    toolId: nanoid(),
    toolType: 'summary',
    data,
  };
});

/**
 * Handler for opening the student summary editor (maieutic method)
 * Student writes their own summary with guidance
 */
registerToolHandler('open_student_summary', async (args, context): Promise<ToolExecutionResult> => {
  const { topic } = args as { topic: string };

  if (!topic || typeof topic !== 'string') {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'summary',
      error: 'Topic is required',
    };
  }

  // Create empty student summary structure
  const studentSummary = createEmptyStudentSummary(
    topic.trim(),
    context?.maestroId,
    context?.sessionId
  );

  return {
    success: true,
    toolId: studentSummary.id,
    toolType: 'summary',
    data: {
      type: 'student_summary',
      ...studentSummary,
    },
  };
});

/**
 * Handler for adding inline comments to student summary
 */
registerToolHandler('student_summary_add_comment', async (args, context): Promise<ToolExecutionResult> => {
  const { sectionId, startOffset, endOffset, text } = args as {
    sectionId: string;
    startOffset: number;
    endOffset: number;
    text: string;
  };

  if (!sectionId || !text) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'summary',
      error: 'sectionId and text are required',
    };
  }

  // This emits an SSE event to update the client
  return {
    success: true,
    toolId: nanoid(),
    toolType: 'summary',
    data: {
      type: 'student_summary_comment',
      sectionId,
      startOffset,
      endOffset,
      text,
      maestroId: context?.maestroId,
    },
  };
});

export { validateSections };
