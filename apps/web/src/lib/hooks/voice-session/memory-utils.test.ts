import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeHtmlComments, fetchConversationMemory, buildMemoryContext } from './memory-utils';

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

describe('fetchConversationMemory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return parsed memory on success', async () => {
    const mockConv = {
      summary: 'Previous lesson on algebra',
      keyFacts: JSON.stringify({ learned: ['quadratics'], preferences: ['visual'] }),
      topics: JSON.stringify(['equations', 'graphs']),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockConv]),
    });

    const result = await fetchConversationMemory('test-maestro');
    expect(result).toEqual({
      summary: 'Previous lesson on algebra',
      keyFacts: { learned: ['quadratics'], preferences: ['visual'] },
      recentTopics: ['equations', 'graphs'],
    });
  });

  it('should return null on API error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const result = await fetchConversationMemory('test-maestro');
    expect(result).toBeNull();
  });

  it('should return null and log warning on network error', async () => {
    const { clientLogger } = await import('@/lib/logger/client');
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failed'));

    const result = await fetchConversationMemory('test-maestro');
    expect(result).toBeNull();
    expect(clientLogger.warn).toHaveBeenCalledWith(
      '[VoiceSession] Failed to fetch conversation memory',
      expect.objectContaining({ maestroId: 'test-maestro', error: 'Network failed' }),
    );
  });

  it('should return null for empty conversations array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    const result = await fetchConversationMemory('test-maestro');
    expect(result).toBeNull();
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
