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
export function useMaterialContent(
  toolCall: ToolCall | ToolCallRef
): UseMaterialContentResult {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we have full data from result, use it directly
    if (hasFullData(toolCall)) {
      setData(toolCall.result?.data as Record<string, unknown>);
      setIsLoading(false);
      setError(null);
      return;
    }

    // If we have arguments (for tools in progress), use those
    if ('arguments' in toolCall && toolCall.arguments) {
      setData(toolCall.arguments as Record<string, unknown>);
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

        setData(material.content);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load material';
        logger.error('Error loading material content', { toolId: toolCall.id, error: message });
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaterial();
  }, [toolCall]);

  return { data, isLoading, error };
}
