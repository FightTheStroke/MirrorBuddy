/**
 * useMaterialContent Hook
 *
 * Loads Material content from API when given a ToolCallRef (lightweight reference).
 * Used by ToolResultDisplay to hydrate tool data for rendering.
 *
 * Pattern:
 * - If toolCall.result?.data exists → use directly (fresh from chat)
 * - If not → load Material by toolCall.id from API
 *
 * Part of T2-04: Remove content duplication Message/Material
 */

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { functionNameToToolType } from '@/lib/tools/constants';
import type { ToolCall, ToolCallRef } from '@/types/tools';

interface MaterialContent {
  content: Record<string, unknown>;
  title?: string;
  subject?: string;
}

interface UseMaterialContentResult {
  /** The tool data ready for rendering */
  data: Record<string, unknown> | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
}

function isContentRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Keep save titles consistent for generated results and persisted material content. */
export function withMaterialTitle(
  type: string,
  content: unknown,
  material?: MaterialContent,
): Record<string, unknown> | null {
  if (!isContentRecord(content)) {
    logger.warn('Material content unavailable', { toolType: type });
    return null;
  }
  const toolType = functionNameToToolType(type) || type;
  const titleKey =
    toolType === 'flashcard'
      ? 'name'
      : toolType === 'summary'
        ? 'topic'
        : ['quiz', 'mindmap', 'demo'].includes(toolType)
          ? 'title'
          : null;
  if (!titleKey) return content;

  const title = [content[titleKey], material?.title, content.topic].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  if (!title) {
    logger.warn('Material title unavailable', { toolType });
    return content;
  }
  return {
    ...content,
    [titleKey]: title,
    ...(content.subject == null && material?.subject ? { subject: material.subject } : {}),
  };
}

/**
 * Type guard to check if toolCall has full data or just a ref
 */
function hasFullData(toolCall: ToolCall | ToolCallRef): toolCall is ToolCall {
  return 'result' in toolCall && toolCall.result?.data !== undefined;
}

/**
 * Hook to load Material content for ToolCallRef
 *
 * @param toolCall - ToolCall with full data or ToolCallRef with just metadata
 * @returns Object with data, loading state, and error
 */
export function useMaterialContent(toolCall: ToolCall | ToolCallRef): UseMaterialContentResult {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we have full data from result, use it directly
    if (hasFullData(toolCall)) {
      setData(withMaterialTitle(toolCall.type, toolCall.result?.data));
      setIsLoading(false);
      setError(null);
      return;
    }

    // If we have arguments (for tools in progress), use those
    if ('arguments' in toolCall && toolCall.arguments) {
      setData(withMaterialTitle(toolCall.type, toolCall.arguments));
      setIsLoading(false);
      setError(null);
      return;
    }

    // Need to fetch from API
    const fetchMaterial = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/materials/${toolCall.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            // Material not found - might be deleted or not yet saved
            logger.debug('Material not found', { toolId: toolCall.id });
            setError('Materiale non trovato');
            return;
          }
          throw new Error(`Failed to fetch material: ${response.status}`);
        }

        const json = await response.json();
        const material = json.material as MaterialContent;

        if (!material?.content) {
          throw new Error('Material response missing content');
        }
        setData(withMaterialTitle(toolCall.type, material.content, material));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load material';
        logger.error('Error loading material content', {
          toolId: toolCall.id,
          errorMessage: message,
        });
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaterial();
  }, [toolCall]);

  return { data, isLoading, error };
}
