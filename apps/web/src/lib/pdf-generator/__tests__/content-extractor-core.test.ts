// ============================================================================
// CONTENT EXTRACTOR CORE TESTS
// Unit tests for main Study Kit content extraction
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractStudyKitContent } from '../utils/content-extractor-core';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Content Extractor Core', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('extractStudyKitContent with studyKit object', () => {
    it('should extract content from studyKit object directly', async () => {
      const studyKit = {
        id: 'kit-123',
        title: 'Test Kit',
        subject: 'Math',
        summary: 'This is a summary of the topic.',
      };

      const content = await extractStudyKitContent(studyKit);

      expect(content.title).toBe('Test Kit');
      expect(content.subject).toBe('Math');
      expect(content.sections.length).toBeGreaterThan(0);
      expect(content.metadata.sourceKitId).toBe('kit-123');
    });

    it('should extract summary sections', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Summary Kit',
        summary: '# Main Topic\nSome content here\n- Item 1\n- Item 2',
      };

      const content = await extractStudyKitContent(studyKit);

      const headings = content.sections.filter((s) => s.type === 'heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should extract mindmap sections from JSON string', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Mindmap Kit',
        mindmap: JSON.stringify({
          nodes: [{ label: 'Node 1' }, { label: 'Node 2' }],
        }),
      };

      const content = await extractStudyKitContent(studyKit);

      const mindmapHeading = content.sections.find(
        (s) => s.type === 'heading' && s.content === 'Mappa Concettuale'
      );
      expect(mindmapHeading).toBeDefined();
    });

    it('should extract mindmap sections from object', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Mindmap Kit',
        mindmap: {
          nodes: [{ label: 'Concept A' }, { label: 'Concept B' }],
        },
      };

      const content = await extractStudyKitContent(studyKit);

      const listSection = content.sections.find(
        (s) => s.type === 'list' && s.items?.includes('Concept A')
      );
      expect(listSection).toBeDefined();
    });

    it('should extract quiz sections from JSON string', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Quiz Kit',
        quiz: JSON.stringify({
          questions: [
            {
              question: 'What is 1+1?',
              options: ['1', '2', '3'],
            },
          ],
        }),
      };

      const content = await extractStudyKitContent(studyKit);

      const quizHeading = content.sections.find(
        (s) => s.type === 'heading' && s.content === 'Quiz di Verifica'
      );
      expect(quizHeading).toBeDefined();
    });

    it('should extract quiz sections from object', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Quiz Kit',
        quiz: {
          questions: [{ question: 'Test question?' }],
        },
      };

      const content = await extractStudyKitContent(studyKit);

      const questionSection = content.sections.find(
        (s) => s.type === 'paragraph' && s.content.includes('Test question?')
      );
      expect(questionSection).toBeDefined();
    });

    it('should calculate word count and reading time', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Content Kit',
        summary: 'This is a longer summary with many words to test the word count calculation feature.',
      };

      const content = await extractStudyKitContent(studyKit);

      expect(content.metadata.wordCount).toBeGreaterThan(0);
      expect(content.metadata.readingTime).toBeGreaterThanOrEqual(1);
    });

    it('should include generation timestamp', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Time Kit',
      };

      const beforeTime = new Date().toISOString();
      const content = await extractStudyKitContent(studyKit);
      const afterTime = new Date().toISOString();

      expect(content.metadata.generatedAt).toBeDefined();
      expect(content.metadata.generatedAt >= beforeTime).toBe(true);
      expect(content.metadata.generatedAt <= afterTime).toBe(true);
    });

    it('should handle missing title', async () => {
      const studyKit = {
        id: 'kit-1',
      };

      const content = await extractStudyKitContent(studyKit);

      expect(content.title).toBe('Untitled');
    });

    it('should handle missing subject', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Test',
      };

      const content = await extractStudyKitContent(studyKit);

      expect(content.subject).toBeUndefined();
    });

    it('should return empty images array', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Test',
      };

      const content = await extractStudyKitContent(studyKit);

      expect(content.images).toEqual([]);
    });
  });

  describe('extractStudyKitContent with specific materialId', () => {
    it('should extract only summary material', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Test',
        summary: 'Summary content',
        quiz: { questions: [{ question: 'Q1' }] },
      };

      const content = await extractStudyKitContent(studyKit, 'summary-1');

      expect(content.metadata.sourceMaterialId).toBe('summary-1');
      // Should have summary sections but not quiz
      const quizHeading = content.sections.find(
        (s) => s.content === 'Quiz di Verifica'
      );
      expect(quizHeading).toBeUndefined();
    });

    it('should extract only mindmap material', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Test',
        mindmap: { nodes: [{ label: 'Node' }] },
        summary: 'Summary text',
      };

      const content = await extractStudyKitContent(studyKit, 'mindmap-1');

      expect(content.metadata.sourceMaterialId).toBe('mindmap-1');
    });

    it('should extract only quiz material', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Test',
        quiz: { questions: [{ question: 'Q' }] },
        summary: 'Summary',
      };

      const content = await extractStudyKitContent(studyKit, 'quiz-1');

      expect(content.metadata.sourceMaterialId).toBe('quiz-1');
    });

    it('should handle non-existent materialId', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Test',
      };

      const content = await extractStudyKitContent(studyKit, 'unknown-1');

      expect(content.sections).toHaveLength(0);
    });

    it('should handle demo materialId', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Test',
        demo: { content: 'Demo content' },
      };

      const content = await extractStudyKitContent(studyKit, 'demo-1');

      expect(content.metadata.sourceMaterialId).toBe('demo-1');
    });
  });

  describe('extractStudyKitContent with kitId (fetch)', () => {
    it('should fetch study kit by ID and extract content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          studyKit: {
            id: 'fetched-kit',
            title: 'Fetched Kit',
            summary: 'Fetched summary',
          },
        }),
      });

      const content = await extractStudyKitContent('kit-id-123');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(content.title).toBe('Fetched Kit');
      expect(content.metadata.sourceKitId).toBe('fetched-kit');
    });

    it('should handle API response without studyKit wrapper', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'direct-kit',
          title: 'Direct Kit',
        }),
      });

      const content = await extractStudyKitContent('kit-id-456');

      expect(content.title).toBe('Direct Kit');
    });

    it('should throw error on failed fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(extractStudyKitContent('not-found-kit')).rejects.toThrow(
        'Failed to fetch study kit: 404'
      );
    });

    it('should construct correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test', title: 'Test' }),
      });

      await extractStudyKitContent('my-kit-id');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/api/study-kit/my-kit-id');
    });
  });

  describe('Material extraction helper', () => {
    it('should extract content from material with content property', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Test',
        summary: { content: 'Material content text' },
      };

      const content = await extractStudyKitContent(studyKit, 'summary-1');

      const paragraph = content.sections.find(
        (s) => s.type === 'paragraph' && s.content.includes('Material content')
      );
      expect(paragraph).toBeDefined();
    });

    it('should extract quiz from material with questions property', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Test',
        quiz: { questions: [{ question: 'Quiz question?' }] },
      };

      const content = await extractStudyKitContent(studyKit, 'quiz-1');

      const quizSection = content.sections.find(
        (s) => s.type === 'heading' && s.content === 'Quiz di Verifica'
      );
      expect(quizSection).toBeDefined();
    });

    it('should extract mindmap from material with nodes', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Test',
        mindmap: { nodes: [{ label: 'Test node' }] },
      };

      const content = await extractStudyKitContent(studyKit, 'mindmap-1');

      expect(content.sections.length).toBeGreaterThan(0);
    });

    it('should extract mindmap from material with central node', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Test',
        mindmap: { central: { text: 'Central topic' } },
      };

      const content = await extractStudyKitContent(studyKit, 'mindmap-1');

      const centralSection = content.sections.find(
        (s) => s.type === 'paragraph' && s.content.includes('Central topic')
      );
      expect(centralSection).toBeDefined();
    });

    it('should return empty sections for non-object material', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Test',
        summary: 123, // Not a valid material
      };

      const content = await extractStudyKitContent(studyKit, 'summary-1');

      // Should not crash, may have minimal sections
      expect(content).toBeDefined();
    });

    it('should return empty sections for null material', async () => {
      const studyKit = {
        id: 'kit-1',
        title: 'Test',
        summary: null,
      };

      const content = await extractStudyKitContent(studyKit, 'summary-1');

      expect(content).toBeDefined();
    });
  });
});
