// ============================================================================
// CONTENT EXTRACTOR PARSERS TESTS
// Unit tests for PDF content extraction and parsing functions
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  extractSummarySections,
  extractMindmapSections,
  extractQuizSections,
  extractMaterialImages,
  calculateWordCount,
  estimateReadingTime,
} from '../utils/content-extractor-parsers';
import type { ContentSection } from '../types';

describe('Content Extractor Parsers', () => {
  describe('extractSummarySections', () => {
    it('should add a summary heading', () => {
      const sections = extractSummarySections('Some text');
      expect(sections[0].type).toBe('heading');
      expect(sections[0].content).toBe('Riassunto');
      expect(sections[0].level).toBe(2);
    });

    it('should parse level 1 headings', () => {
      const summary = '# Main Title\nSome content';
      const sections = extractSummarySections(summary);

      const h1 = sections.find((s) => s.level === 1);
      expect(h1).toBeDefined();
      expect(h1?.content).toBe('Main Title');
    });

    it('should parse level 2 headings', () => {
      const summary = '## Subtitle\nMore content';
      const sections = extractSummarySections(summary);

      const h2s = sections.filter((s) => s.level === 2);
      expect(h2s.some((s) => s.content === 'Subtitle')).toBe(true);
    });

    it('should parse level 3 headings', () => {
      const summary = '### Sub-subtitle\nContent here';
      const sections = extractSummarySections(summary);

      const h3 = sections.find((s) => s.level === 3);
      expect(h3).toBeDefined();
      expect(h3?.content).toBe('Sub-subtitle');
    });

    it('should parse paragraphs', () => {
      const summary = 'This is a paragraph.\nThis continues.';
      const sections = extractSummarySections(summary);

      const paragraphs = sections.filter((s) => s.type === 'paragraph');
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it('should parse list items with dashes', () => {
      const summary = '- First item\n- Second item';
      const sections = extractSummarySections(summary);

      const lists = sections.filter((s) => s.type === 'list');
      expect(lists.length).toBeGreaterThan(0);
    });

    it('should parse list items with asterisks', () => {
      const summary = '* First item\n* Second item';
      const sections = extractSummarySections(summary);

      const lists = sections.filter((s) => s.type === 'list');
      expect(lists.length).toBeGreaterThan(0);
    });

    it('should parse quotes', () => {
      const summary = '> This is a quote';
      const sections = extractSummarySections(summary);

      const quote = sections.find((s) => s.type === 'quote');
      expect(quote).toBeDefined();
      expect(quote?.content).toBe('This is a quote');
    });

    it('should handle empty lines as paragraph separators', () => {
      const summary = 'First paragraph.\n\nSecond paragraph.';
      const sections = extractSummarySections(summary);

      const paragraphs = sections.filter((s) => s.type === 'paragraph');
      expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    });

    it('should trim content properly', () => {
      const summary = '   Trimmed text   ';
      const sections = extractSummarySections(summary);

      const paragraph = sections.find((s) => s.type === 'paragraph');
      expect(paragraph?.content).toBe('Trimmed text');
    });

    it('should handle empty summary', () => {
      const sections = extractSummarySections('');
      expect(sections[0].content).toBe('Riassunto');
    });

    it('should handle mixed content', () => {
      const summary = `# Title
Some paragraph text.

## Section
- Item 1
- Item 2

> A quote here

More text.`;

      const sections = extractSummarySections(summary);

      expect(sections.some((s) => s.type === 'heading')).toBe(true);
      expect(sections.some((s) => s.type === 'paragraph')).toBe(true);
      expect(sections.some((s) => s.type === 'list')).toBe(true);
      expect(sections.some((s) => s.type === 'quote')).toBe(true);
    });
  });

  describe('extractMindmapSections', () => {
    it('should add a mindmap heading', () => {
      const sections = extractMindmapSections({});
      expect(sections[0].type).toBe('heading');
      expect(sections[0].content).toBe('Mappa Concettuale');
      expect(sections[0].level).toBe(2);
    });

    it('should extract nodes with labels', () => {
      const mindmap = {
        nodes: [{ label: 'Node 1' }, { label: 'Node 2' }],
      };

      const sections = extractMindmapSections(mindmap);

      const list = sections.find((s) => s.type === 'list');
      expect(list).toBeDefined();
      expect(list?.items).toContain('Node 1');
      expect(list?.items).toContain('Node 2');
    });

    it('should extract nodes with text property', () => {
      const mindmap = {
        nodes: [{ text: 'Text 1' }, { text: 'Text 2' }],
      };

      const sections = extractMindmapSections(mindmap);

      const list = sections.find((s) => s.type === 'list');
      expect(list?.items).toContain('Text 1');
    });

    it('should handle central node structure', () => {
      const mindmap = {
        central: {
          text: 'Main Topic',
          children: [{ text: 'Child 1' }, { text: 'Child 2' }],
        },
      };

      const sections = extractMindmapSections(mindmap);

      const paragraph = sections.find(
        (s) => s.type === 'paragraph' && s.content.includes('Main Topic')
      );
      expect(paragraph).toBeDefined();

      const list = sections.find(
        (s) => s.type === 'list' && s.content.includes('Argomenti')
      );
      expect(list?.items).toContain('Child 1');
      expect(list?.items).toContain('Child 2');
    });

    it('should handle central node without text', () => {
      const mindmap = {
        central: {},
      };

      const sections = extractMindmapSections(mindmap);

      const paragraph = sections.find((s) => s.type === 'paragraph');
      expect(paragraph?.content).toContain('Non specificato');
    });

    it('should filter empty nodes', () => {
      const mindmap = {
        nodes: [{ label: '' }, { label: 'Valid' }, { text: '' }],
      };

      const sections = extractMindmapSections(mindmap);

      const list = sections.find((s) => s.type === 'list');
      expect(list?.items).toHaveLength(1);
      expect(list?.items).toContain('Valid');
    });

    it('should handle empty mindmap', () => {
      const sections = extractMindmapSections({});
      expect(sections).toHaveLength(1);
      expect(sections[0].content).toBe('Mappa Concettuale');
    });

    it('should handle non-array nodes gracefully', () => {
      const mindmap = { nodes: 'not an array' };
      const sections = extractMindmapSections(mindmap);
      expect(sections).toBeDefined();
    });
  });

  describe('extractQuizSections', () => {
    it('should add a quiz heading', () => {
      const sections = extractQuizSections({});
      expect(sections[0].type).toBe('heading');
      expect(sections[0].content).toBe('Quiz di Verifica');
      expect(sections[0].level).toBe(2);
    });

    it('should extract questions with options', () => {
      const quiz = {
        questions: [
          {
            question: 'What is 2+2?',
            options: ['3', '4', '5'],
          },
        ],
      };

      const sections = extractQuizSections(quiz);

      const questionSection = sections.find(
        (s) => s.type === 'paragraph' && s.content.includes('What is 2+2?')
      );
      expect(questionSection).toBeDefined();

      const optionsList = sections.find((s) => s.type === 'list');
      expect(optionsList?.items).toContain('3');
      expect(optionsList?.items).toContain('4');
    });

    it('should include question numbers', () => {
      const quiz = {
        questions: [
          { question: 'Q1' },
          { question: 'Q2' },
        ],
      };

      const sections = extractQuizSections(quiz);

      const q1 = sections.find(
        (s) => s.type === 'paragraph' && s.content.includes('Domanda 1')
      );
      const q2 = sections.find(
        (s) => s.type === 'paragraph' && s.content.includes('Domanda 2')
      );

      expect(q1).toBeDefined();
      expect(q2).toBeDefined();
    });

    it('should extract explanations as quotes', () => {
      const quiz = {
        questions: [
          {
            question: 'Test question',
            explanation: 'This is why the answer is correct',
          },
        ],
      };

      const sections = extractQuizSections(quiz);

      const explanation = sections.find((s) => s.type === 'quote');
      expect(explanation?.content).toContain('This is why the answer is correct');
    });

    it('should handle questions without options', () => {
      const quiz = {
        questions: [{ question: 'Open question?' }],
      };

      const sections = extractQuizSections(quiz);

      const lists = sections.filter((s) => s.type === 'list');
      expect(lists).toHaveLength(0);
    });

    it('should handle empty quiz', () => {
      const sections = extractQuizSections({});
      expect(sections).toHaveLength(1);
    });

    it('should handle non-array questions', () => {
      const quiz = { questions: 'not an array' };
      const sections = extractQuizSections(quiz);
      expect(sections).toBeDefined();
    });
  });

  describe('extractMaterialImages', () => {
    it('should extract images with src', () => {
      const material = {
        images: [{ src: '/img/test.png', alt: 'Test image' }],
      };

      const images = extractMaterialImages(material);

      expect(images).toHaveLength(1);
      expect(images[0].src).toBe('/img/test.png');
      expect(images[0].alt).toBe('Test image');
    });

    it('should extract images with url instead of src', () => {
      const material = {
        images: [{ url: '/img/test.png' }],
      };

      const images = extractMaterialImages(material);

      expect(images[0].src).toBe('/img/test.png');
    });

    it('should include caption if present', () => {
      const material = {
        images: [{ src: '/img/test.png', caption: 'Image caption' }],
      };

      const images = extractMaterialImages(material);

      expect(images[0].caption).toBe('Image caption');
    });

    it('should default alt to "Image"', () => {
      const material = {
        images: [{ src: '/img/test.png' }],
      };

      const images = extractMaterialImages(material);

      expect(images[0].alt).toBe('Image');
    });

    it('should handle null material', () => {
      const images = extractMaterialImages(null);
      expect(images).toHaveLength(0);
    });

    it('should handle undefined material', () => {
      const images = extractMaterialImages(undefined);
      expect(images).toHaveLength(0);
    });

    it('should handle material without images', () => {
      const images = extractMaterialImages({});
      expect(images).toHaveLength(0);
    });

    it('should handle non-object images array items', () => {
      const material = {
        images: ['string', 123, null],
      };

      const images = extractMaterialImages(material);
      expect(images).toHaveLength(0);
    });

    it('should handle multiple images', () => {
      const material = {
        images: [
          { src: '/img/1.png' },
          { src: '/img/2.png' },
          { src: '/img/3.png' },
        ],
      };

      const images = extractMaterialImages(material);
      expect(images).toHaveLength(3);
    });
  });

  describe('calculateWordCount', () => {
    it('should count words in paragraph content', () => {
      const sections: ContentSection[] = [
        { type: 'paragraph', content: 'This is four words' },
      ];

      const count = calculateWordCount(sections);
      expect(count).toBe(4);
    });

    it('should count words in headings', () => {
      const sections: ContentSection[] = [
        { type: 'heading', content: 'Three Word Heading', level: 1 },
      ];

      const count = calculateWordCount(sections);
      expect(count).toBe(3);
    });

    it('should count words in list items', () => {
      const sections: ContentSection[] = [
        { type: 'list', content: '', items: ['two words', 'three more words'] },
      ];

      const count = calculateWordCount(sections);
      expect(count).toBe(5);
    });

    it('should count words from multiple sections', () => {
      const sections: ContentSection[] = [
        { type: 'heading', content: 'Title', level: 1 },
        { type: 'paragraph', content: 'Some text here' },
        { type: 'list', content: 'List:', items: ['item one'] },
      ];

      const count = calculateWordCount(sections);
      expect(count).toBe(1 + 3 + 1 + 2); // Title + Some text here + List: + item one
    });

    it('should handle empty sections', () => {
      const sections: ContentSection[] = [];
      const count = calculateWordCount(sections);
      expect(count).toBe(0);
    });

    it('should handle sections without content', () => {
      const sections: ContentSection[] = [
        { type: 'list', content: '', items: [] },
      ];

      const count = calculateWordCount(sections);
      expect(count).toBe(0);
    });

    it('should handle extra whitespace', () => {
      const sections: ContentSection[] = [
        { type: 'paragraph', content: '  multiple   spaces   here  ' },
      ];

      const count = calculateWordCount(sections);
      expect(count).toBe(3);
    });
  });

  describe('estimateReadingTime', () => {
    it('should estimate reading time for dyslexia profile', () => {
      const time = estimateReadingTime(240, 'dyslexia');
      expect(time).toBe(2); // 240 words / 120 wpm = 2 min
    });

    it('should estimate reading time for dyscalculia profile', () => {
      const time = estimateReadingTime(360, 'dyscalculia');
      expect(time).toBe(2); // 360 words / 180 wpm = 2 min
    });

    it('should estimate reading time for dysgraphia profile', () => {
      const time = estimateReadingTime(180, 'dysgraphia');
      expect(time).toBe(1); // 180 words / 180 wpm = 1 min
    });

    it('should estimate reading time for dysorthography profile', () => {
      const time = estimateReadingTime(300, 'dysorthography');
      expect(time).toBe(2); // 300 words / 150 wpm = 2 min
    });

    it('should estimate reading time for adhd profile', () => {
      const time = estimateReadingTime(450, 'adhd');
      expect(time).toBe(3); // 450 words / 150 wpm = 3 min
    });

    it('should estimate reading time for dyspraxia profile', () => {
      const time = estimateReadingTime(280, 'dyspraxia');
      expect(time).toBe(2); // 280 words / 140 wpm = 2 min
    });

    it('should estimate reading time for stuttering profile', () => {
      const time = estimateReadingTime(200, 'stuttering');
      expect(time).toBe(2); // 200 words / 100 wpm = 2 min
    });

    it('should use default wpm for unknown profile', () => {
      const time = estimateReadingTime(180, 'unknown');
      expect(time).toBe(1); // 180 words / 180 wpm (default) = 1 min
    });

    it('should round up to nearest minute', () => {
      const time = estimateReadingTime(190, 'dysgraphia');
      expect(time).toBe(2); // 190 / 180 = 1.05, ceil = 2
    });

    it('should handle zero words', () => {
      const time = estimateReadingTime(0, 'dyslexia');
      expect(time).toBe(0);
    });
  });
});
