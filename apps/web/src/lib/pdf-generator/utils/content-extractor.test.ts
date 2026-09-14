// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractStudyKitContent } from './content-extractor';

const kitId = '12345678-1234-4123-8123-123456789abc';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('study kit extraction through real parsers', () => {
  it('returns stable metadata and defaults for an empty kit', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-14T12:00:00Z'));
    expect(await extractStudyKitContent({})).toEqual({
      title: 'Untitled',
      subject: undefined,
      sections: [],
      images: [],
      metadata: {
        wordCount: 0,
        readingTime: 0,
        generatedAt: '2026-09-14T12:00:00.000Z',
        sourceKitId: '',
        sourceMaterialId: undefined,
      },
    });
  });

  it.each([false, true])('extracts all materials with serialized=%s data', async (serialized) => {
    const mindmap = { nodes: [{ label: 'Force' }, { text: 'Mass' }] };
    const quiz = {
      questions: [{ question: 'What is force?', options: ['A', 'B'], explanation: 'A push' }],
    };
    const result = await extractStudyKitContent({
      id: kitId,
      title: 'Physics',
      subject: 'Science',
      summary: 'Energy is conserved',
      mindmap: serialized ? JSON.stringify(mindmap) : mindmap,
      quiz: serialized ? JSON.stringify(quiz) : quiz,
    });
    expect(result).toMatchObject({ title: 'Physics', subject: 'Science' });
    expect(result.sections).toEqual([
      { type: 'heading', content: 'Riassunto', level: 2 },
      { type: 'paragraph', content: 'Energy is conserved' },
      { type: 'heading', content: 'Mappa Concettuale', level: 2 },
      { type: 'list', content: 'Concetti principali:', items: ['Force', 'Mass'] },
      { type: 'heading', content: 'Quiz di Verifica', level: 2 },
      { type: 'paragraph', content: 'Domanda 1: What is force?' },
      { type: 'list', content: 'Opzioni:', items: ['A', 'B'] },
      { type: 'quote', content: 'Spiegazione: A push' },
    ]);
    expect(result.metadata).toMatchObject({ wordCount: 24, readingTime: 1, sourceKitId: kitId });
  });

  it('coerces scalar kit metadata and summary to printable text', async () => {
    const result = await extractStudyKitContent({ id: 12, title: 42, subject: 7, summary: 123 });
    expect(result).toMatchObject({ title: '42', subject: '7', metadata: { sourceKitId: '12' } });
    expect(result.sections).toContainEqual({ type: 'paragraph', content: '123' });
  });

  it('selects one material and carries its images without including other materials', async () => {
    const result = await extractStudyKitContent(
      {
        summary: {
          content: 'Chosen summary',
          images: [{ src: '/diagram.png', alt: 'Diagram', caption: 'Forces' }],
        },
        quiz: { questions: [{ question: 'Not selected' }] },
      },
      'summary-1',
    );
    expect(result.sections).toEqual([
      { type: 'heading', content: 'Riassunto', level: 2 },
      { type: 'paragraph', content: 'Chosen summary' },
    ]);
    expect(result.images).toEqual([{ src: '/diagram.png', alt: 'Diagram', caption: 'Forces' }]);
    expect(result.metadata.sourceMaterialId).toBe('summary-1');
  });

  it('does not substitute the whole kit for a missing material', async () => {
    const result = await extractStudyKitContent({ summary: 'Other material' }, 'quiz-absent');
    expect(result.sections).toEqual([]);
    expect(result.images).toEqual([]);
  });

  it('rounds reading time up across the 200-word boundary', async () => {
    const result = await extractStudyKitContent({ summary: Array(200).fill('word').join(' ') });
    expect(result.metadata).toMatchObject({ wordCount: 201, readingTime: 2 });
  });

  it.each(['mindmap', 'quiz'])(
    'rejects malformed serialized %s rather than creating a partial PDF',
    async (key) => {
      await expect(extractStudyKitContent({ [key]: '{invalid' })).rejects.toThrow(SyntaxError);
    },
  );
});

describe('study kit retrieval', () => {
  it.each(['../secret', 'https://example.com', 'not-a-uuid'])(
    'rejects unsafe kit identifier %s before fetch',
    async (id) => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await expect(extractStudyKitContent(id)).rejects.toThrow('Invalid kit ID format');
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([true, false])(
    'accepts API envelope=%s and uses configured server origin',
    async (envelope) => {
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://mirrorbuddy.example');
      const kit = { id: kitId, title: 'Fetched kit', summary: 'Fetched content' };
      const fetchMock = vi
        .fn()
        .mockResolvedValue(Response.json(envelope ? { studyKit: kit } : kit));
      vi.stubGlobal('fetch', fetchMock);
      expect(await extractStudyKitContent(kitId)).toMatchObject({
        title: 'Fetched kit',
        metadata: { sourceKitId: kitId },
      });
      expect(fetchMock).toHaveBeenCalledWith(`https://mirrorbuddy.example/api/study-kit/${kitId}`);
    },
  );

  it('uses the local server fallback when no public origin is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    const fetchMock = vi.fn().mockResolvedValue(Response.json({}));
    vi.stubGlobal('fetch', fetchMock);
    await extractStudyKitContent(kitId);
    expect(fetchMock).toHaveBeenCalledWith(`http://localhost:3000/api/study-kit/${kitId}`);
  });

  it('uses the current browser origin rather than a server environment value', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://browser.example' } });
    const fetchMock = vi.fn().mockResolvedValue(Response.json({}));
    vi.stubGlobal('fetch', fetchMock);
    await extractStudyKitContent(kitId);
    expect(fetchMock).toHaveBeenCalledWith(`https://browser.example/api/study-kit/${kitId}`);
  });

  it('reports HTTP failures without parsing the response body', async () => {
    const response = new Response('Unavailable', { status: 503 });
    const json = vi.spyOn(response, 'json');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    await expect(extractStudyKitContent(kitId)).rejects.toThrow('Failed to fetch study kit: 503');
    expect(json).not.toHaveBeenCalled();
  });

  it('propagates network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(extractStudyKitContent(kitId)).rejects.toThrow('offline');
  });
});
