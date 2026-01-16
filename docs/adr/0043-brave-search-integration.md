# ADR 0043: Brave Search API Integration

## Status

Accepted

## Context

Maestri need access to real-time information to provide current, relevant educational content:
- **Lovelace** (Computer Science): Rust, AI agents, modern programming trends
- **Cicerone** (Civic Education): Daily news, current events, political developments
- **Chris** (Sport): Upcoming Olympics, recent sports events, athlete news

The previous search implementation only used:
- Italian Wikipedia API (static encyclopedia content)
- Treccani link generation (no API, just links)
- YouTube search links (no actual search)

This limited maestri to historical/static knowledge, unable to discuss current events.

## Decision

Integrate **Brave Search API** as the primary web search provider with Wikipedia fallback:

1. **Brave Search API** (when `BRAVE_SEARCH_API_KEY` is configured):
   - Real-time web results
   - Italian language and country targeting (`search_lang=it`, `country=it`)
   - 5 results per query
   - Free tier: 2,000 queries/month

2. **Wikipedia fallback** (when API key not configured or API fails):
   - Maintains backward compatibility
   - No cost for basic usage
   - Educational content focus

3. **Treccani link** always added as authoritative Italian source

## Implementation

**File**: `src/lib/tools/handlers/search-handler.ts`

```typescript
// Priority: Brave Search → Wikipedia fallback
async function performWebSearch(query: string): Promise<SearchResult[]> {
  let results = await searchWithBrave(query);  // Returns null if not configured
  if (!results) {
    results = await searchWithWikipedia(query);
  }
  results.push(treccaniLink);  // Always add
  return results;
}
```

**Environment Variable**: `BRAVE_SEARCH_API_KEY`
- Optional (system works without it)
- Get key at: https://brave.com/search/api/

## Consequences

### Positive
- Maestri can discuss current events, tech news, sports results
- Configurable: works without API key (Wikipedia fallback)
- Cost-effective: free tier sufficient for development/testing
- Privacy-focused: Brave doesn't track users

### Negative
- Requires API key for full functionality
- Free tier limited to 2,000 queries/month
- External dependency for real-time search

### Neutral
- Search results quality depends on Brave's index
- Italian content coverage may vary

## Alternatives Considered

1. **Google Custom Search API**: More comprehensive but expensive, privacy concerns
2. **Bing Search API**: Good alternative, Microsoft ecosystem alignment
3. **DuckDuckGo**: No official API
4. **Azure OpenAI with Bing**: Not available (OpenAI ≠ ChatGPT with browsing)

Brave chosen for: privacy focus, free tier, simple API, Italian language support.
