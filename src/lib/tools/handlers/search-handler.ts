// ============================================================================
// SEARCH HANDLER
// Searches web and YouTube for educational content
// Uses Wikipedia API (free) and YouTube search links
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';
import type { SearchData, SearchResult, ToolExecutionResult } from '@/types/tools';

/**
 * Wikipedia API response types
 */
interface WikipediaSearchResult {
  title: string;
  pageid: number;
  snippet: string;
}

interface WikipediaApiResponse {
  query?: {
    search: WikipediaSearchResult[];
  };
}

/**
 * Search Italian Wikipedia for educational content.
 * Uses the MediaWiki API which is free and requires no API key.
 */
async function performWebSearch(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    // Search Italian Wikipedia
    const wikiUrl = new URL('https://it.wikipedia.org/w/api.php');
    wikiUrl.searchParams.set('action', 'query');
    wikiUrl.searchParams.set('list', 'search');
    wikiUrl.searchParams.set('srsearch', query);
    wikiUrl.searchParams.set('srlimit', '3');
    wikiUrl.searchParams.set('format', 'json');
    wikiUrl.searchParams.set('origin', '*');

    const response = await fetch(wikiUrl.toString());
    if (response.ok) {
      const data: WikipediaApiResponse = await response.json();
      const searchResults = data.query?.search || [];

      for (const item of searchResults) {
        // Strip HTML tags from snippet
        const cleanSnippet = item.snippet.replace(/<[^>]*>/g, '');
        results.push({
          type: 'web',
          title: `${item.title} - Wikipedia`,
          url: `https://it.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
          description: cleanSnippet,
        });
      }
    }
  } catch (error) {
    logger.error('Wikipedia search failed', { error, query });
  }

  // Always add Treccani link as authoritative Italian source
  results.push({
    type: 'web',
    title: `Cerca "${query}" su Treccani`,
    url: `https://www.treccani.it/enciclopedia/ricerca/${encodeURIComponent(query)}/`,
    description: 'Enciclopedia Italiana - fonte autorevole per approfondimenti',
  });

  return results;
}

/**
 * Generate YouTube educational search links.
 * Returns direct search URLs for educational content.
 * Optimized for Italian educational videos.
 */
async function performYouTubeSearch(query: string): Promise<SearchResult[]> {
  // Generate educational search queries
  const educationalQuery = `${query} spiegazione lezione`;
  const courseQuery = `${query} corso italiano`;

  const results: SearchResult[] = [
    {
      type: 'youtube',
      title: `Video didattici: ${query}`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(educationalQuery)}`,
      description: 'Cerca video spiegazioni e lezioni su questo argomento',
    },
    {
      type: 'youtube',
      title: `Corsi e tutorial: ${query}`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(courseQuery)}`,
      description: 'Cerca corsi completi e tutorial approfonditi',
    },
  ];

  return results;
}

/**
 * Register the search handler
 */
registerToolHandler('web_search', async (args): Promise<ToolExecutionResult> => {
  const { query, type = 'all' } = args as {
    query: string;
    type?: 'web' | 'youtube' | 'all';
  };

  // Validate query
  if (!query || typeof query !== 'string') {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'search',
      error: 'Search query is required',
    };
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'search',
      error: 'Search query must be at least 2 characters',
    };
  }

  // Perform searches based on type
  let results: SearchResult[] = [];

  try {
    if (type === 'web' || type === 'all') {
      const webResults = await performWebSearch(trimmedQuery);
      results = results.concat(webResults);
    }

    if (type === 'youtube' || type === 'all') {
      const youtubeResults = await performYouTubeSearch(trimmedQuery);
      results = results.concat(youtubeResults);
    }
  } catch (error) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'search',
      error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }

  const data: SearchData = {
    query: trimmedQuery,
    searchType: type,
    results,
  };

  return {
    success: true,
    toolId: nanoid(),
    toolType: 'search',
    data,
  };
});

export { performWebSearch, performYouTubeSearch };
