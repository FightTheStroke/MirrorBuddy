// ============================================================================
// ARCHIVE SEARCH HANDLER
// Searches student's saved materials (mindmaps, quizzes, flashcards, etc.)
// Allows Maestri to reference and use previously created content
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';
import type { ToolExecutionResult } from '@/types/tools';

interface ArchiveMaterial {
  id: string;
  toolId: string;
  toolType: string;
  title: string;
  subject?: string;
  preview?: string;
  maestroId?: string;
  createdAt: string;
  isBookmarked?: boolean;
  userRating?: number;
}

interface ArchiveSearchData {
  query?: string;
  toolType?: string;
  subject?: string;
  results: ArchiveMaterial[];
  totalFound: number;
  message: string;
}

/**
 * Tool: search_archive
 * Searches the student's saved materials archive.
 * Returns a list of matching materials that can be referenced in conversation.
 */
registerToolHandler('search_archive', async (args, context): Promise<ToolExecutionResult> => {
  const { query, toolType, subject } = args as {
    query?: string;
    toolType?: string;
    subject?: string;
  };

  const toolId = nanoid();

  // Validate at least one search criterion
  if (!query && !toolType && !subject) {
    return {
      success: false,
      toolId,
      toolType: 'search',
      error: 'Specifica almeno un criterio di ricerca: query, tipo di materiale, o materia.',
    };
  }

  try {
    // Call the search API
    const searchParams = new URLSearchParams();
    if (query) searchParams.set('q', query);
    if (toolType) searchParams.set('type', toolType);
    if (subject) searchParams.set('subject', subject);
    if (context?.userId) searchParams.set('userId', context.userId);
    searchParams.set('limit', '10');

    // Use relative URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/materials/search?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Search API returned ${response.status}`);
    }

    const { materials, totalFound } = await response.json() as {
      materials: ArchiveMaterial[];
      totalFound: number;
    };

    // Format results for AI
    const toolTypeLabel: Record<string, string> = {
      mindmap: 'mappa mentale',
      quiz: 'quiz',
      flashcard: 'flashcard',
      summary: 'riassunto',
      demo: 'demo interattiva',
      homework: 'compito',
      diagram: 'diagramma',
      timeline: 'timeline',
    };

    let message = '';
    if (totalFound === 0) {
      message = query
        ? `Non ho trovato materiali con "${query}".`
        : `Non ho trovato materiali ${toolType ? `di tipo ${toolTypeLabel[toolType] || toolType}` : ''} ${subject ? `sulla materia ${subject}` : ''}.`;
    } else {
      message = `Ho trovato ${totalFound} material${totalFound === 1 ? 'e' : 'i'}:\n`;
      materials.forEach((m, i) => {
        const typeLabel = toolTypeLabel[m.toolType] || m.toolType;
        const date = new Date(m.createdAt).toLocaleDateString('it-IT');
        message += `${i + 1}. **${m.title}** (${typeLabel}) - ${date}${m.isBookmarked ? ' ⭐' : ''}\n`;
      });
    }

    const data: ArchiveSearchData = {
      query,
      toolType,
      subject,
      results: materials,
      totalFound,
      message,
    };

    logger.info('Archive search completed', {
      query,
      toolType,
      subject,
      resultsCount: totalFound,
    });

    return {
      success: true,
      toolId,
      toolType: 'search',
      data,
    };
  } catch (error) {
    logger.error('Archive search failed', { error: String(error) });
    return {
      success: false,
      toolId,
      toolType: 'search',
      error: 'Errore durante la ricerca nell\'archivio. Riprova.',
    };
  }
});
