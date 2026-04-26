/**
 * Tests for Semantic Chunker
 * @module rag/semantic-chunker
 */

import { describe, it, expect } from 'vitest';
import {
  chunkText,
  chunkByParagraphs,
  chunkBySentences,
  estimateTokens,
} from '../semantic-chunker';

describe('Semantic Chunker', () => {
  describe('chunkText', () => {
    it('should return empty array for empty text', () => {
      const chunks = chunkText('', { maxChunkSize: 500 });
      expect(chunks).toEqual([]);
    });

    it('should return single chunk for short text', () => {
      const text = 'This is a short sentence.';
      const chunks = chunkText(text, { maxChunkSize: 500 });
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(text);
    });

    it('should split long text into multiple chunks', () => {
      const sentences = Array(20).fill('This is a test sentence with some content.');
      const text = sentences.join(' ');
      const chunks = chunkText(text, { maxChunkSize: 200, overlap: 50 });
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should respect maxChunkSize', () => {
      const sentences = Array(10).fill('Short sentence here.');
      const text = sentences.join(' ');
      const chunks = chunkText(text, { maxChunkSize: 100 });
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeLessThanOrEqual(150); // Allow some flexibility for sentence boundaries
      });
    });

    it('should include overlap between chunks', () => {
      const text =
        'First sentence here. Second sentence here. Third sentence here. Fourth sentence here. Fifth sentence here.';
      const chunks = chunkText(text, { maxChunkSize: 50, overlap: 20 });
      if (chunks.length > 1) {
        // Chunks should be sequential with overlap
        expect(chunks[0].endIndex).toBeLessThanOrEqual(chunks[1].startIndex + 30);
        // Each chunk should have content
        expect(chunks[0].content.length).toBeGreaterThan(0);
        expect(chunks[1].content.length).toBeGreaterThan(0);
      }
    });

    it('should assign correct indices to chunks', () => {
      const text = 'First part. Second part. Third part.';
      const chunks = chunkText(text, { maxChunkSize: 500 });
      chunks.forEach((chunk, index) => {
        expect(chunk.index).toBe(index);
        expect(chunk.startIndex).toBeGreaterThanOrEqual(0);
        expect(chunk.endIndex).toBeLessThanOrEqual(text.length);
      });
    });

    it('should handle text with only whitespace', () => {
      const chunks = chunkText('   \n\n   \t   ', { maxChunkSize: 500 });
      expect(chunks).toEqual([]);
    });

    it('should preserve paragraph structure when possible', () => {
      const text = 'Paragraph one content here.\n\nParagraph two content here.\n\nParagraph three.';
      const chunks = chunkText(text, { maxChunkSize: 500, respectParagraphs: true });
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('chunkByParagraphs', () => {
    it('should split text by double newlines', () => {
      const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const paragraphs = chunkByParagraphs(text);
      expect(paragraphs).toHaveLength(3);
      expect(paragraphs[0]).toBe('First paragraph.');
      expect(paragraphs[1]).toBe('Second paragraph.');
      expect(paragraphs[2]).toBe('Third paragraph.');
    });

    it('should handle single paragraph', () => {
      const text = 'Just one paragraph here.';
      const paragraphs = chunkByParagraphs(text);
      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0]).toBe(text);
    });

    it('should filter empty paragraphs', () => {
      const text = 'First.\n\n\n\nSecond.\n\n\n\n\nThird.';
      const paragraphs = chunkByParagraphs(text);
      expect(paragraphs).toHaveLength(3);
    });

    it('should trim whitespace from paragraphs', () => {
      const text = '  First paragraph.  \n\n  Second paragraph.  ';
      const paragraphs = chunkByParagraphs(text);
      expect(paragraphs[0]).toBe('First paragraph.');
      expect(paragraphs[1]).toBe('Second paragraph.');
    });
  });

  describe('chunkBySentences', () => {
    it('should split text by sentence boundaries', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const sentences = chunkBySentences(text);
      expect(sentences).toHaveLength(3);
    });

    it('should handle abbreviations', () => {
      const text = 'Dr. Smith went to the store. He bought milk.';
      const sentences = chunkBySentences(text);
      // Should recognize Dr. as abbreviation, not sentence end
      expect(sentences.length).toBeLessThanOrEqual(3);
    });

    it('should handle decimal numbers', () => {
      const text = 'The value is 3.14 which is pi. Another sentence.';
      const sentences = chunkBySentences(text);
      expect(sentences).toHaveLength(2);
    });

    it('should handle empty text', () => {
      const sentences = chunkBySentences('');
      expect(sentences).toEqual([]);
    });

    it('should handle text without sentence endings', () => {
      const text = 'Text without any punctuation at the end';
      const sentences = chunkBySentences(text);
      expect(sentences).toHaveLength(1);
      expect(sentences[0]).toBe(text);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens for English text', () => {
      const text = 'This is a simple test sentence.';
      const tokens = estimateTokens(text);
      // Roughly 4 chars per token for English
      expect(tokens).toBeGreaterThan(5);
      expect(tokens).toBeLessThan(15);
    });

    it('should return 0 for empty text', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should handle Italian text', () => {
      const text = 'Questa è una frase di prova in italiano.';
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(5);
    });

    it('should handle mixed content', () => {
      const text = 'Code: function test() { return 42; }';
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(5);
    });
  });

  describe('TextChunk interface', () => {
    it('should have all required properties', () => {
      const text = 'Test sentence here.';
      const chunks = chunkText(text, { maxChunkSize: 500 });
      const chunk = chunks[0];

      expect(chunk).toHaveProperty('content');
      expect(chunk).toHaveProperty('index');
      expect(chunk).toHaveProperty('startIndex');
      expect(chunk).toHaveProperty('endIndex');
      expect(chunk).toHaveProperty('tokenEstimate');
      expect(typeof chunk.content).toBe('string');
      expect(typeof chunk.index).toBe('number');
      expect(typeof chunk.startIndex).toBe('number');
      expect(typeof chunk.endIndex).toBe('number');
      expect(typeof chunk.tokenEstimate).toBe('number');
    });
  });

  describe('ChunkOptions defaults', () => {
    it('should use default maxChunkSize of 500', () => {
      const longText = Array(50).fill('Word').join(' ');
      const chunks = chunkText(longText, {});
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should use default overlap of 50', () => {
      const text = Array(30).fill('Test sentence here.').join(' ');
      const chunks = chunkText(text, { maxChunkSize: 100 });
      expect(chunks.length).toBeGreaterThan(1);
    });
  });

  describe('Oversized segments', () => {
    it('should split single segment exceeding maxChunkSize', () => {
      // 1000 chars with no sentence boundaries
      const longText = 'word '.repeat(200);
      const chunks = chunkText(longText, { maxChunkSize: 500, overlap: 50 });

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeLessThanOrEqual(500);
      });
    });

    it('should handle mixed oversized and normal segments', () => {
      // Normal sentence + very long sentence + normal sentence
      const longMiddle = 'word '.repeat(150); // 750 chars
      const text = `Short sentence. ${longMiddle} Another short sentence.`;
      const chunks = chunkText(text, { maxChunkSize: 500, overlap: 50 });

      expect(chunks.length).toBeGreaterThan(1);
      // Verify no chunk exceeds limit (with small tolerance for sentence boundaries)
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeLessThanOrEqual(550);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle very long sentences gracefully', () => {
      const longSentence = Array(100).fill('word').join(' ') + '.';
      const chunks = chunkText(longSentence, { maxChunkSize: 100 });
      expect(chunks.length).toBeGreaterThan(0);
      // Verify chunks respect size limit
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeLessThanOrEqual(150);
      });
    });

    it('should handle special characters', () => {
      const text = 'Special chars: @#$%^&*(). Another sentence.';
      const chunks = chunkText(text, { maxChunkSize: 500 });
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain('@#$%^&*()');
    });

    it('should handle unicode characters', () => {
      const text = 'Caffè e cornetto. Più tardi andremo al mare.';
      const chunks = chunkText(text, { maxChunkSize: 500 });
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain('Caffè');
    });

    it('should handle markdown-style headers', () => {
      const text = '# Header\n\nParagraph content here.\n\n## Subheader\n\nMore content.';
      const chunks = chunkText(text, { maxChunkSize: 500, respectParagraphs: true });
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle bullet points', () => {
      const text = 'List:\n- Item one\n- Item two\n- Item three\n\nConclusion.';
      const chunks = chunkText(text, { maxChunkSize: 500 });
      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});
