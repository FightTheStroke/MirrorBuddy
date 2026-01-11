/**
 * Archive Plugin - Search student's saved materials
 * Allows maestri to reference and use previously created content
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

const ArchivePluginSchema = z.object({
  query: z.string().max(500).optional(),
  toolType: z.enum(['mindmap', 'quiz', 'flashcard', 'summary', 'diagram', 'timeline']).optional(),
  subject: z.string().max(100).optional(),
}).refine(
  (d) => d.query || d.toolType || d.subject,
  'At least one search criterion required'
);

async function handleArchivePlugin(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const validated = ArchivePluginSchema.parse(args);
    const { query, toolType, subject } = validated;

    const searchParams = new URLSearchParams();
    if (query) searchParams.set('q', query);
    if (toolType) searchParams.set('type', toolType);
    if (subject) searchParams.set('subject', subject);
    if (context?.userId) searchParams.set('userId', context.userId);
    searchParams.set('limit', '10');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/materials/search?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error(`Search API: ${response.status}`);

    const { materials, totalFound } = (await response.json()) as {
      materials: Array<{ id: string; title: string; toolType: string }>;
      totalFound: number;
    };

    if (totalFound === 0) {
      return createErrorResult('search_archive', ToolErrorCode.EXECUTION_FAILED, 'No materials found');
    }

    return createSuccessResult('search_archive', {
      query,
      toolType,
      subject,
      results: materials,
      resultCount: totalFound,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResult(
        'search_archive',
        ToolErrorCode.VALIDATION_FAILED,
        error.issues[0].message,
        { validationErrors: error.issues }
      );
    }
    return createErrorResult(
      'search_archive',
      ToolErrorCode.EXECUTION_FAILED,
      error instanceof Error ? error.message : 'Archive search failed'
    );
  }
}

/**
 * Archive Plugin Definition
 * Enables maestri to search and reference saved student materials
 * Fulfills F-02 (Maestri can create tools) and F-03 (Tools integrate with system)
 */
export const archivePlugin: ToolPlugin = {
  // Identification
  id: 'search_archive',
  name: 'Archivio Personale',

  // Organization
  category: ToolCategory.NAVIGATION,

  // Validation
  schema: ArchivePluginSchema,

  // Execution
  handler: handleArchivePlugin,

  // Voice interaction
  voicePrompt: {
    template: 'Vuoi cercare nel tuo archivio personale?',
    requiresContext: [],
    fallback: 'Vuoi cercare nel tuo archivio?',
  },
  voiceFeedback: {
    template: 'Ho trovato {resultCount} materiali nel tuo archivio!',
    requiresContext: ['resultCount'],
    fallback: 'Ricerca completata!',
  },
  voiceEnabled: true,

  // Voice triggers - Italian and English variations
  triggers: [
    'archivio',
    'cerca archivio',
    'miei materiali',
    'my materials',
    'archive',
    'saved',
  ],

  // Prerequisites
  prerequisites: [],

  // Permissions
  permissions: [Permission.READ_PROFILE, Permission.VOICE_OUTPUT],
};

export default archivePlugin;
