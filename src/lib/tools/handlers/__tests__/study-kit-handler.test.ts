// ============================================================================
// STUDY KIT HANDLER TESTS
// Unit tests for PDF processing and study material generation
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock pdf-parse with class-based mock
let mockGetText = vi.fn();
let mockGetInfo = vi.fn();
let mockDestroy = vi.fn();

vi.mock('pdf-parse', () => {
  // These will be set in beforeEach
  return {
    PDFParse: class MockPDFParse {
      getText() {
        return mockGetText();
      }
      getInfo() {
        return mockGetInfo();
      }
      destroy() {
        return mockDestroy();
      }
    },
  };
});

// Mock chatCompletion
const mockChatCompletion = vi.fn();
vi.mock('@/lib/ai/providers', () => ({
  chatCompletion: (...args: unknown[]) => mockChatCompletion(...args),
}));

// Import after mocks
import {
  extractTextFromPDF,
  generateSummary,
  generateMindmap,
  generateDemo,
  generateQuiz,
  processStudyKit,
} from '../study-kit-handler';

describe('Study Kit Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetText = vi.fn();
    mockGetInfo = vi.fn();
    mockDestroy = vi.fn();
    mockChatCompletion.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('extractTextFromPDF', () => {
    it('should extract text from valid PDF buffer', async () => {
      mockGetText.mockResolvedValue({ text: 'Test PDF content' });
      mockGetInfo.mockResolvedValue({ total: 5 });
      mockDestroy.mockResolvedValue(undefined);

      const buffer = Buffer.from('fake pdf data');
      const result = await extractTextFromPDF(buffer);

      expect(result.text).toBe('Test PDF content');
      expect(result.pageCount).toBe(5);
    });

    it('should throw error for empty buffer', async () => {
      const emptyBuffer = Buffer.from('');

      await expect(extractTextFromPDF(emptyBuffer)).rejects.toThrow(
        'Empty or invalid PDF buffer'
      );
    });

    it('should handle getText error', async () => {
      mockGetText.mockRejectedValue(new Error('PDF parsing failed'));
      mockDestroy.mockResolvedValue(undefined);

      const buffer = Buffer.from('fake pdf data');

      await expect(extractTextFromPDF(buffer)).rejects.toThrow(
        'Failed to parse PDF: PDF parsing failed'
      );
    });

    it('should handle getInfo error', async () => {
      mockGetText.mockResolvedValue({ text: 'Text content' });
      mockGetInfo.mockRejectedValue(new Error('Info extraction failed'));
      mockDestroy.mockResolvedValue(undefined);

      const buffer = Buffer.from('fake pdf data');

      await expect(extractTextFromPDF(buffer)).rejects.toThrow(
        'Failed to parse PDF: Info extraction failed'
      );
    });

    it('should handle destroy error gracefully', async () => {
      mockGetText.mockResolvedValue({ text: 'Test content' });
      mockGetInfo.mockResolvedValue({ total: 3 });
      mockDestroy.mockRejectedValue(new Error('Destroy failed'));

      const buffer = Buffer.from('fake pdf data');
      const result = await extractTextFromPDF(buffer);

      // Should still return result despite destroy error
      expect(result.text).toBe('Test content');
      expect(result.pageCount).toBe(3);
    });
  });

  describe('generateSummary', () => {
    it('should generate summary from text', async () => {
      mockChatCompletion.mockResolvedValue({
        content: 'This is the generated summary about the topic.',
      });

      const result = await generateSummary('Document text content', 'Test Title');

      expect(result).toBe('This is the generated summary about the topic.');
      expect(mockChatCompletion).toHaveBeenCalledTimes(1);
    });

    it('should include subject in prompt when provided', async () => {
      mockChatCompletion.mockResolvedValue({ content: 'Summary with subject' });

      await generateSummary('Content', 'Title', 'matematica');

      const callArgs = mockChatCompletion.mock.calls[0];
      expect(callArgs[0][0].content).toContain('matematica');
    });

    it('should trim whitespace from result', async () => {
      mockChatCompletion.mockResolvedValue({
        content: '  Summary with whitespace  \n',
      });

      const result = await generateSummary('Content', 'Title');

      expect(result).toBe('Summary with whitespace');
    });

    it('should truncate long text to 8000 characters', async () => {
      mockChatCompletion.mockResolvedValue({ content: 'Summary' });

      const longText = 'a'.repeat(10000);
      await generateSummary(longText, 'Title');

      const callArgs = mockChatCompletion.mock.calls[0];
      // Should contain truncation indicator
      expect(callArgs[0][0].content).toContain('...');
    });
  });

  describe('generateMindmap', () => {
    it('should generate mindmap from text', async () => {
      const mindmapJson = JSON.stringify({
        title: 'Test Mindmap',
        nodes: [
          { id: '1', label: 'Main Concept' },
          { id: '1a', label: 'Sub Concept', parentId: '1' },
        ],
      });

      mockChatCompletion.mockResolvedValue({ content: mindmapJson });

      const result = await generateMindmap('Document content', 'Test Title');

      expect(result.title).toBe('Test Mindmap');
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].id).toBe('1');
      expect(result.nodes[0].label).toBe('Main Concept');
      expect(result.nodes[1].parentId).toBe('1');
    });

    it('should throw error when JSON extraction fails', async () => {
      mockChatCompletion.mockResolvedValue({
        content: 'No JSON here, just text',
      });

      await expect(generateMindmap('Content', 'Title')).rejects.toThrow(
        'Failed to parse mindmap JSON'
      );
    });

    it('should throw error for invalid mindmap structure', async () => {
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify({ invalid: 'structure' }),
      });

      await expect(generateMindmap('Content', 'Title')).rejects.toThrow(
        'Invalid mindmap structure'
      );
    });

    it('should handle numeric IDs', async () => {
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Numeric IDs',
          nodes: [{ id: 123, label: 'Node', parentId: 456 }],
        }),
      });

      const result = await generateMindmap('Content', 'Title');

      expect(result.nodes[0].id).toBe('123');
      expect(result.nodes[0].parentId).toBe('456');
    });
  });

  describe('generateDemo', () => {
    it('should return null for non-STEM subject', async () => {
      const result = await generateDemo('Content', 'Title', 'storia');

      expect(result).toBeNull();
      expect(mockChatCompletion).not.toHaveBeenCalled();
    });

    it('should generate demo for STEM subject', async () => {
      const demoJson = JSON.stringify({
        title: 'Math Demo',
        description: 'Interactive demo',
        html: '<div>Demo</div>',
        css: '.demo { color: blue; }',
        js: 'console.log("demo");',
      });

      mockChatCompletion.mockResolvedValue({ content: demoJson });

      const result = await generateDemo('Content', 'Title', 'matematica');

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Math Demo');
      expect(result?.html).toBe('<div>Demo</div>');
      expect(result?.css).toBe('.demo { color: blue; }');
      expect(result?.js).toBe('console.log("demo");');
    });

    it('should recognize various STEM subjects', async () => {
      const subjects = [
        'matematica',
        'fisica',
        'chimica',
        'biologia',
        'scienze',
        'informatica',
      ];

      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Demo',
          html: '',
          css: '',
          js: '',
        }),
      });

      for (const subject of subjects) {
        mockChatCompletion.mockClear();
        await generateDemo('Content', 'Title', subject);
        expect(mockChatCompletion).toHaveBeenCalledTimes(1);
      }
    });

    it('should return null when JSON parsing fails', async () => {
      mockChatCompletion.mockResolvedValue({ content: 'Invalid JSON' });

      const result = await generateDemo('Content', 'Title', 'matematica');

      expect(result).toBeNull();
    });

    it('should handle JSON parsing error gracefully', async () => {
      mockChatCompletion.mockResolvedValue({
        content: '{ broken json ]',
      });

      const result = await generateDemo('Content', 'Title', 'fisica');

      expect(result).toBeNull();
    });

    it('should use title when response title is missing', async () => {
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify({
          description: 'Demo without title',
          html: '<div></div>',
        }),
      });

      const result = await generateDemo('Content', 'My Title', 'matematica');

      expect(result?.title).toBe('My Title');
    });
  });

  describe('generateQuiz', () => {
    it('should generate quiz from text', async () => {
      const quizJson = JSON.stringify({
        topic: 'Mathematics',
        questions: [
          {
            question: 'What is 2+2?',
            options: ['3', '4', '5', '6'],
            correctIndex: 1,
            explanation: 'Basic addition',
          },
        ],
      });

      mockChatCompletion.mockResolvedValue({ content: quizJson });

      const result = await generateQuiz('Content', 'Math Quiz');

      expect(result.topic).toBe('Mathematics');
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].question).toBe('What is 2+2?');
      expect(result.questions[0].options).toHaveLength(4);
      expect(result.questions[0].correctIndex).toBe(1);
    });

    it('should throw error when JSON extraction fails', async () => {
      mockChatCompletion.mockResolvedValue({
        content: 'No JSON here',
      });

      await expect(generateQuiz('Content', 'Title')).rejects.toThrow(
        'Failed to parse quiz JSON'
      );
    });

    it('should throw error for invalid quiz structure', async () => {
      mockChatCompletion.mockResolvedValue({
        content: JSON.stringify({ notATopic: 'value' }),
      });

      await expect(generateQuiz('Content', 'Title')).rejects.toThrow(
        'Invalid quiz structure'
      );
    });

    it('should handle questions without explanation', async () => {
      const quizJson = JSON.stringify({
        topic: 'Quiz',
        questions: [
          {
            question: 'Question?',
            options: ['A', 'B', 'C', 'D'],
            correctIndex: 0,
          },
        ],
      });

      mockChatCompletion.mockResolvedValue({ content: quizJson });

      const result = await generateQuiz('Content', 'Title');

      expect(result.questions[0].explanation).toBeUndefined();
    });
  });

  describe('processStudyKit', () => {
    beforeEach(() => {
      // Setup default mocks for full processing
      mockGetText.mockResolvedValue({ text: 'PDF content text' });
      mockGetInfo.mockResolvedValue({ total: 10 });
      mockDestroy.mockResolvedValue(undefined);
    });

    it('should process PDF and generate all materials', async () => {
      // Mock AI responses for each step
      mockChatCompletion
        .mockResolvedValueOnce({ content: 'Generated summary' }) // Summary
        .mockResolvedValueOnce({
          content: JSON.stringify({
            title: 'Mindmap',
            nodes: [{ id: '1', label: 'Node' }],
          }),
        }) // Mindmap
        .mockResolvedValueOnce({
          content: JSON.stringify({
            title: 'Demo',
            html: '<div></div>',
            css: '',
            js: '',
          }),
        }) // Demo (STEM)
        .mockResolvedValueOnce({
          content: JSON.stringify({
            topic: 'Quiz',
            questions: [
              { question: 'Q1?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
            ],
          }),
        }); // Quiz

      const buffer = Buffer.from('pdf data');
      const result = await processStudyKit(buffer, 'Test Title', 'matematica');

      expect(result.title).toBe('Test Title');
      expect(result.summary).toBe('Generated summary');
      expect(result.mindmap).toBeDefined();
      expect(result.mindmap!.nodes).toHaveLength(1);
      expect(result.quiz).toBeDefined();
      expect(result.quiz!.topic).toBe('Quiz');
      expect(result.status).toBe('ready');
      expect(result.pageCount).toBe(10);
    });

    it('should skip demo for non-STEM subjects', async () => {
      mockChatCompletion
        .mockResolvedValueOnce({ content: 'Summary' })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            title: 'Map',
            nodes: [{ id: '1', label: 'N' }],
          }),
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            topic: 'Q',
            questions: [
              { question: 'Q?', options: ['1', '2', '3', '4'], correctIndex: 0 },
            ],
          }),
        });

      const buffer = Buffer.from('pdf data');
      const result = await processStudyKit(buffer, 'Title', 'storia');

      expect(result.demo).toBeUndefined();
    });

    it('should call progress callback', async () => {
      mockChatCompletion
        .mockResolvedValueOnce({ content: 'Summary' })
        .mockResolvedValueOnce({
          content: JSON.stringify({ title: 'M', nodes: [] }),
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            topic: 'Q',
            questions: [
              { question: 'Q?', options: ['1', '2', '3', '4'], correctIndex: 0 },
            ],
          }),
        });

      const onProgress = vi.fn();
      const buffer = Buffer.from('pdf data');

      await processStudyKit(buffer, 'Title', 'storia', onProgress);

      expect(onProgress).toHaveBeenCalledWith('parsing', 0.1);
      expect(onProgress).toHaveBeenCalledWith('generating_summary', 0.25);
      expect(onProgress).toHaveBeenCalledWith('generating_mindmap', 0.45);
      expect(onProgress).toHaveBeenCalledWith('generating_demo', 0.65);
      expect(onProgress).toHaveBeenCalledWith('generating_quiz', 0.85);
      expect(onProgress).toHaveBeenCalledWith('complete', 1.0);
    });

    it('should calculate word count correctly', async () => {
      mockGetText.mockResolvedValue({ text: 'one two three four five' });
      mockGetInfo.mockResolvedValue({ total: 1 });

      mockChatCompletion
        .mockResolvedValueOnce({ content: 'S' })
        .mockResolvedValueOnce({
          content: JSON.stringify({ title: 'M', nodes: [] }),
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            topic: 'Q',
            questions: [
              { question: 'Q?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
            ],
          }),
        });

      const buffer = Buffer.from('pdf');
      const result = await processStudyKit(buffer, 'Title', 'italiano');

      expect(result.wordCount).toBe(5);
    });

    it('should throw error when PDF extraction fails', async () => {
      mockGetText.mockRejectedValue(new Error('PDF error'));
      mockDestroy.mockResolvedValue(undefined);

      const buffer = Buffer.from('bad pdf');

      await expect(processStudyKit(buffer, 'Title')).rejects.toThrow();
    });
  });
});
