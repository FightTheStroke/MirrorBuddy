// ============================================================================
// SEARCH HANDLER
// Searches web and YouTube for educational content
// Uses Brave Search API (if configured) with Wikipedia fallback
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';
import type { SearchData, SearchResult, ToolExecutionResult } from '@/types/tools';

// Brave Search API key (optional - falls back to Wikipedia if not set)
const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY;

/** Brave Search API response types */
interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
}

interface BraveSearchResponse {
  web?: { results: BraveSearchResult[] };
}

/** Wikipedia API response types */
interface WikipediaSearchResult {
  title: string;
  pageid: number;
  snippet: string;
}

interface WikipediaApiResponse {
  query?: { search: WikipediaSearchResult[] };
}

/** Strip HTML tags using character-by-character state machine */
function stripHtmlTags(html: string): string {
  let result = '';
  let inTag = false;
  for (let i = 0; i < html.length; i++) {
    const char = html[i];
    if (char === '<') inTag = true;
    else if (char === '>') inTag = false;
    else if (!inTag) result += char;
  }
  return result;
}

/** Search using Brave Search API. Returns null if not configured or fails. */
async function searchWithBrave(query: string): Promise<SearchResult[] | null> {
  if (!BRAVE_SEARCH_API_KEY) return null;

  try {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', '5');
    url.searchParams.set('search_lang', 'it');
    url.searchParams.set('country', 'it');

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_SEARCH_API_KEY,
      },
    });

    if (!response.ok) {
      logger.warn('Brave Search API error', { status: response.status, query });
      return null;
    }

    const data: BraveSearchResponse = await response.json();
    const results: SearchResult[] = [];

    for (const item of data.web?.results || []) {
      results.push({
        type: 'web',
        title: item.title,
        url: item.url,
        description: item.description || '',
      });
    }

    logger.debug('Brave Search returned results', { count: results.length, query });
    return results;
  } catch (error) {
    logger.error('Brave Search failed', { error, query });
    return null;
  }
}

/** Search Italian Wikipedia. Used as fallback when Brave is not configured. */
async function searchWithWikipedia(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
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
      for (const item of data.query?.search || []) {
        results.push({
          type: 'web',
          title: `${item.title} - Wikipedia`,
          url: `https://it.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
          description: stripHtmlTags(item.snippet),
        });
      }
    }
  } catch (error) {
    logger.error('Wikipedia search failed', { error, query });
  }

  return results;
}

/** Perform web search using Brave (if configured) or Wikipedia fallback. */
async function performWebSearch(query: string): Promise<SearchResult[]> {
  // Try Brave Search first (real-time web results)
  let results = await searchWithBrave(query);

  // Fallback to Wikipedia if Brave not configured or failed
  if (!results) {
    results = await searchWithWikipedia(query);
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

/** Generate YouTube educational search links. */
async function performYouTubeSearch(query: string): Promise<SearchResult[]> {
  const educationalQuery = `${query} spiegazione lezione`;
  const courseQuery = `${query} corso italiano`;

  return [
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
}

/** Register the search handler */
registerToolHandler('web_search', async (args): Promise<ToolExecutionResult> => {
  const { query, type = 'all' } = args as {
    query: string;
    type?: 'web' | 'youtube' | 'all';
  };

  if (!query || typeof query !== 'string') {
    return { success: false, toolId: nanoid(), toolType: 'search', error: 'Search query is required' };
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return { success: false, toolId: nanoid(), toolType: 'search', error: 'Search query must be at least 2 characters' };
  }

  let results: SearchResult[] = [];

  try {
    if (type === 'web' || type === 'all') {
      results = results.concat(await performWebSearch(trimmedQuery));
    }
    if (type === 'youtube' || type === 'all') {
      results = results.concat(await performYouTubeSearch(trimmedQuery));
    }
  } catch (error) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'search',
      error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }

  const data: SearchData = { query: trimmedQuery, searchType: type, results };

  return { success: true, toolId: nanoid(), toolType: 'search', data };
});

export { performWebSearch, performYouTubeSearch };
