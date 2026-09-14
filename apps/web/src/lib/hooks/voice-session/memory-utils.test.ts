import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeHtmlComments, fetchConversationMemory, buildMemoryContext } from './memory-utils';
import { routeConversationItem, routeEnvelope } from './__tests__/memory-utils-fixtures';

// Mock clientLogger
vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('sanitizeHtmlComments', () => {
  it('should remove standard HTML comments', () => {
    expect(sanitizeHtmlComments('Hello <!-- comment --> World')).toBe('Hello  World');
  });

  it('should handle nested comments', () => {
    const result = sanitizeHtmlComments('A <!-- outer <!-- inner --> --> B');
    // After removing inner comment, orphaned --> is also removed
    expect(result.trim()).toBe('A   B');
  });

  it('should return text without comments unchanged', () => {
    expect(sanitizeHtmlComments('No comments here')).toBe('No comments here');
  });
});

function mockJsonResponse(body: unknown, ok = true) {
  return vi
    .fn()
    .mockResolvedValue({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) });
}

describe('fetchConversationMemory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('should return parsed memory from the actual items/pagination envelope', async () => {
    global.fetch = mockJsonResponse(routeEnvelope([routeConversationItem()]));

    const result = await fetchConversationMemory('test-maestro');
    expect(result).toEqual({
      summary: 'Previous lesson on algebra',
      keyFacts: { learned: ['quadratics'], preferences: ['visual'] },
      recentTopics: ['equations', 'graphs'],
    });
  });

  it('should decode string-encoded keyFacts and topics', async () => {
    global.fetch = mockJsonResponse(
      routeEnvelope([
        routeConversationItem({
          keyFacts: JSON.stringify({ learned: ['quadratics'], preferences: ['visual'] }),
          topics: JSON.stringify(['equations', 'graphs']),
        }),
      ]),
    );

    const result = await fetchConversationMemory('test-maestro');
    expect(result).toEqual({
      summary: 'Previous lesson on algebra',
      keyFacts: { learned: ['quadratics'], preferences: ['visual'] },
      recentTopics: ['equations', 'graphs'],
    });
  });

  it('should keep the summary when keyFacts are null', async () => {
    global.fetch = mockJsonResponse(
      routeEnvelope([routeConversationItem({ keyFacts: null, topics: [] })]),
    );

    const result = await fetchConversationMemory('test-maestro');
    expect(result).toEqual({ summary: 'Previous lesson on algebra' });
  });

  it('should discard malformed keyFacts with an explicit warning and keep the rest', async () => {
    const { clientLogger } = await import('@/lib/logger/client');
    global.fetch = mockJsonResponse(
      routeEnvelope([routeConversationItem({ keyFacts: '{not valid json' })]),
    );

    const result = await fetchConversationMemory('test-maestro');
    expect(result).toEqual({
      summary: 'Previous lesson on algebra',
      recentTopics: ['equations', 'graphs'],
    });
    expect(clientLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('conversation memory field'),
      expect.objectContaining({ maestroId: 'test-maestro', field: 'keyFacts' }),
    );
  });

  it('should discard topics that are not a string list', async () => {
    const { clientLogger } = await import('@/lib/logger/client');
    global.fetch = mockJsonResponse(
      routeEnvelope([routeConversationItem({ topics: [{ name: 'equations' }] })]),
    );

    const result = await fetchConversationMemory('test-maestro');
    expect(result?.recentTopics).toBeUndefined();
    expect(result?.summary).toBe('Previous lesson on algebra');
    expect(clientLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('conversation memory field'),
      expect.objectContaining({ maestroId: 'test-maestro', field: 'topics' }),
    );
  });

  it('should return null on API error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const result = await fetchConversationMemory('test-maestro');
    expect(result).toBeNull();
  });

  it('should return null and log info on network error', async () => {
    const { clientLogger } = await import('@/lib/logger/client');
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failed'));

    const result = await fetchConversationMemory('test-maestro');
    expect(result).toBeNull();
    expect(clientLogger.info).toHaveBeenCalledWith(
      '[VoiceSession] Failed to fetch conversation memory',
      expect.objectContaining({ maestroId: 'test-maestro', error: 'Network failed' }),
    );
  });

  it('should return null without warning for an empty items list', async () => {
    const { clientLogger } = await import('@/lib/logger/client');
    global.fetch = mockJsonResponse(routeEnvelope([]));

    const result = await fetchConversationMemory('test-maestro');
    expect(result).toBeNull();
    expect(clientLogger.warn).not.toHaveBeenCalled();
  });

  it('should return null and warn when the payload is null', async () => {
    const { clientLogger } = await import('@/lib/logger/client');
    global.fetch = mockJsonResponse(null);

    const result = await fetchConversationMemory('test-maestro');
    expect(result).toBeNull();
    expect(clientLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('conversations response'),
      expect.objectContaining({ maestroId: 'test-maestro' }),
    );
  });

  it('should not silently swallow an unexpected response shape', async () => {
    const { clientLogger } = await import('@/lib/logger/client');
    global.fetch = mockJsonResponse([routeConversationItem()]);

    const result = await fetchConversationMemory('test-maestro');
    expect(result).toBeNull();
    expect(clientLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('conversations response'),
      expect.objectContaining({ maestroId: 'test-maestro' }),
    );
  });

  it('should return null when the conversation carries no usable memory', async () => {
    global.fetch = mockJsonResponse(
      routeEnvelope([routeConversationItem({ summary: null, keyFacts: null, topics: [] })]),
    );

    expect(await fetchConversationMemory('test-maestro')).toBeNull();
  });
});

describe('buildMemoryContext', () => {
  it('should return empty string for null memory', () => {
    expect(buildMemoryContext(null)).toBe('');
  });

  it('should include summary when present', () => {
    const result = buildMemoryContext({ summary: 'Studied algebra' });
    expect(result).toContain('Riassunto');
    expect(result).toContain('Studied algebra');
  });

  it('should include learned concepts', () => {
    const result = buildMemoryContext({
      keyFacts: { learned: ['quadratics', 'linear equations'] },
    });
    expect(result).toContain('Concetti capiti');
    expect(result).toContain('quadratics');
    expect(result).toContain('linear equations');
  });

  it('should include preferences', () => {
    const result = buildMemoryContext({
      keyFacts: { preferences: ['visual aids'] },
    });
    expect(result).toContain('Preferenze');
    expect(result).toContain('visual aids');
  });

  it('should include recent topics', () => {
    const result = buildMemoryContext({
      recentTopics: ['geometry', 'trigonometry'],
    });
    expect(result).toContain('Argomenti recenti');
    expect(result).toContain('geometry');
  });

  it('should include personalization instruction', () => {
    const result = buildMemoryContext({ summary: 'test' });
    expect(result).toContain('USA QUESTE INFORMAZIONI');
  });
});
