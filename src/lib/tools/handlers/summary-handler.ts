// ============================================================================
// SUMMARY HANDLER
// Creates structured summaries with sections and key points
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { nanoid } from 'nanoid';
import type { SummaryData, SummarySection, ToolExecutionResult } from '@/types/tools';

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

export { validateSections };
