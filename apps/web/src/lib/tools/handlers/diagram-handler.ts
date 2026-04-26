// ============================================================================
// DIAGRAM HANDLER
// Creates Mermaid diagrams (flowchart, sequence, class, ER)
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { nanoid } from 'nanoid';
import type { DiagramData, ToolExecutionResult } from '@/types/tools';

const VALID_DIAGRAM_TYPES = ['flowchart', 'sequence', 'class', 'er'] as const;

/**
 * Validate Mermaid code basic structure
 */
function validateMermaidCode(
  code: string,
  diagramType: string
): { valid: boolean; error?: string } {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Mermaid code is required' };
  }

  const trimmedCode = code.trim();
  if (trimmedCode.length < 10) {
    return { valid: false, error: 'Mermaid code is too short' };
  }

  // Basic validation - check if code starts with expected Mermaid declaration
  const validPrefixes: Record<string, string[]> = {
    flowchart: ['graph', 'flowchart'],
    sequence: ['sequenceDiagram'],
    class: ['classDiagram'],
    er: ['erDiagram'],
  };

  const prefixes = validPrefixes[diagramType] || [];
  const hasValidPrefix = prefixes.some(
    (prefix) =>
      trimmedCode.toLowerCase().startsWith(prefix.toLowerCase())
  );

  if (!hasValidPrefix && prefixes.length > 0) {
    return {
      valid: false,
      error: `Mermaid code for ${diagramType} should start with: ${prefixes.join(' or ')}`,
    };
  }

  return { valid: true };
}

/**
 * Register the diagram handler
 */
registerToolHandler('create_diagram', async (args): Promise<ToolExecutionResult> => {
  const { topic, diagramType, mermaidCode } = args as {
    topic: string;
    diagramType: 'flowchart' | 'sequence' | 'class' | 'er';
    mermaidCode: string;
  };

  // Validate topic
  if (!topic || typeof topic !== 'string') {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'diagram',
      error: 'Topic is required and must be a string',
    };
  }

  // Validate diagram type
  if (!VALID_DIAGRAM_TYPES.includes(diagramType)) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'diagram',
      error: `Invalid diagram type. Must be one of: ${VALID_DIAGRAM_TYPES.join(', ')}`,
    };
  }

  // Validate Mermaid code
  const validation = validateMermaidCode(mermaidCode, diagramType);
  if (!validation.valid) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'diagram',
      error: validation.error,
    };
  }

  const data: DiagramData = {
    topic: topic.trim(),
    diagramType,
    mermaidCode: mermaidCode.trim(),
  };

  return {
    success: true,
    toolId: nanoid(),
    toolType: 'diagram',
    data,
  };
});

export { validateMermaidCode };
