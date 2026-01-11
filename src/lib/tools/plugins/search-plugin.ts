/**
 * Search Plugin
 * Searches web (Wikipedia) and YouTube for educational content
 * Provides links to authoritative sources and video tutorials
 */

import { z } from 'zod';
import {
  ToolPlugin,
  ToolCategory,
  Permission,
  createSuccessResult,
  createErrorResult,
  ToolErrorCode,
} from '../plugin/types';
import type { ToolContext, ToolResult } from '@/types/tools';
import {
  performWebSearch,
  performYouTubeSearch,
} from '../handlers/search-handler';

/**
 * Zod schema for search plugin input validation
 */
const SearchPluginSchema = z.object({
  query: z
    .string()
    .min(2, 'Search query must be at least 2 characters')
    .max(500, 'Search query must be under 500 characters'),
  type: z
    .enum(['web', 'youtube', 'all'])
    .default('all'),
});

/**
 * Search plugin handler
 * Performs web and YouTube searches for educational content
 */
async function handleSearchPlugin(
  args: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> {
  try {
    const validated = SearchPluginSchema.parse(args);
    const { query, type } = validated;

    // Perform searches based on type
    const results: Array<{ type: string; title: string; url: string; description?: string }> = [];

    if (type === 'web' || type === 'all') {
      const webResults = await performWebSearch(query);
      results.push(...webResults);
    }

    if (type === 'youtube' || type === 'all') {
      const youtubeResults = await performYouTubeSearch(query);
      results.push(...youtubeResults);
    }

    if (results.length === 0) {
      return createErrorResult(
        'web_search',
        ToolErrorCode.EXECUTION_FAILED,
        'No results found'
      );
    }

    // Return search results
    return createSuccessResult('web_search', {
      query: query.trim(),
      searchType: type,
      results,
      resultCount: results.length,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResult(
        'web_search',
        ToolErrorCode.VALIDATION_FAILED,
        `Validation error: ${error.issues[0].message}`,
        { validationErrors: error.issues }
      );
    }

    return createErrorResult(
      'web_search',
      ToolErrorCode.EXECUTION_FAILED,
      error instanceof Error ? error.message : 'Search failed'
    );
  }
}

/**
 * Search Plugin Definition
 * Enables maestri to search for educational resources
 * Fulfills F-02 (Maestri can create tools) and F-03 (Tools integrate with system)
 */
export const searchPlugin: ToolPlugin = {
  // Identification
  id: 'web_search',
  name: 'Ricerca Web',

  // Organization
  category: ToolCategory.UTILITY,

  // Validation
  schema: SearchPluginSchema,

  // Execution
  handler: handleSearchPlugin,

  // Voice interaction
  voicePrompt: {
    template: 'Vuoi cercare "{query}" su Wikipedia e YouTube?',
    requiresContext: ['query'],
    fallback: 'Vuoi effettuare una ricerca?',
  },
  voiceFeedback: {
    template: 'Ho trovato {resultCount} risultati su {query}!',
    requiresContext: ['resultCount', 'query'],
    fallback: 'Ricerca completata!',
  },
  voiceEnabled: true,

  // Voice triggers - Italian and English variations
  triggers: [
    'ricerca',
    'cerca',
    'search',
    'google',
    'wikipedia',
    'youtube',
    'video',
  ],

  // Prerequisites
  prerequisites: [],

  // Permissions
  permissions: [Permission.READ_CONVERSATION, Permission.VOICE_OUTPUT],
};

export default searchPlugin;
