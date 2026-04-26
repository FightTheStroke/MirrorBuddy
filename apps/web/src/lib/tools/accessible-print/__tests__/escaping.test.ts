/**
 * Integration tests: verify escapeHtml coverage in print/export renderers
 * Ensures HTML special chars in user/AI content are escaped in output.
 */

import { describe, it, expect } from 'vitest';
import { renderMindmap, renderFlashcards, renderSummary, renderQuiz } from '../renderers';
import type { MindmapNode, SummaryData, QuizData } from '@/types/tools';

const XSS_PAYLOAD = '<script>alert("xss")</script>';
const ESCAPED_SCRIPT = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';

describe('XSS escaping in print/export renderers', () => {
  describe('renderMindmap', () => {
    it('should escape HTML in node labels', () => {
      const nodes: MindmapNode[] = [
        { id: 'root', label: 'Root', parentId: null },
        { id: 'child', label: XSS_PAYLOAD, parentId: 'root' },
      ];
      const html = renderMindmap(nodes, null);
      expect(html).toContain(ESCAPED_SCRIPT);
      expect(html).not.toContain('<script>');
    });
  });

  describe('renderFlashcards', () => {
    it('should escape HTML in front and back text', () => {
      const cards = [{ front: XSS_PAYLOAD, back: XSS_PAYLOAD }];
      const html = renderFlashcards(cards);
      const matches = html.match(/&lt;script&gt;/g);
      expect(matches).toHaveLength(2);
      expect(html).not.toContain('<script>');
    });
  });

  describe('renderSummary', () => {
    it('should escape topic, section title, content, and key points', () => {
      const data: SummaryData = {
        topic: XSS_PAYLOAD,
        sections: [
          {
            title: XSS_PAYLOAD,
            content: XSS_PAYLOAD,
            keyPoints: [XSS_PAYLOAD],
          },
        ],
        length: 'medium',
      };
      const html = renderSummary(data);
      // topic + title + content + keyPoint = 4 occurrences
      const matches = html.match(/&lt;script&gt;/g);
      expect(matches!.length).toBeGreaterThanOrEqual(4);
      expect(html).not.toContain('<script>');
    });
  });

  describe('renderQuiz', () => {
    it('should escape question, options, and explanation', () => {
      const data: QuizData = {
        topic: 'Test Quiz',
        questions: [
          {
            question: XSS_PAYLOAD,
            options: [XSS_PAYLOAD, 'safe'],
            correctIndex: 0,
            explanation: XSS_PAYLOAD,
          },
        ],
      };
      const html = renderQuiz(data);
      // question + option + explanation = 3 occurrences
      const matches = html.match(/&lt;script&gt;/g);
      expect(matches!.length).toBeGreaterThanOrEqual(3);
      expect(html).not.toContain('<script>');
    });
  });

  describe('ampersand escaping', () => {
    it('should escape & in all renderers', () => {
      const nodes: MindmapNode[] = [
        { id: 'root', label: 'Root', parentId: null },
        { id: 'r', label: 'A & B', parentId: 'root' },
      ];
      expect(renderMindmap(nodes, null)).toContain('A &amp; B');

      const cards = [{ front: 'Q & A', back: 'R & D' }];
      const flashHtml = renderFlashcards(cards);
      expect(flashHtml).toContain('Q &amp; A');
      expect(flashHtml).toContain('R &amp; D');
    });
  });
});
