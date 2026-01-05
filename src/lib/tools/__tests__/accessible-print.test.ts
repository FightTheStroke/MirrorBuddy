/**
 * Tests for Accessible Print Utility
 *
 * Verifies WCAG 2.1 AA compliance and accessibility settings application.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  generateAccessibleHtml,
  getAccessibilityStyles,
} from '../accessible-print';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('accessible-print', () => {
  describe('getAccessibilityStyles', () => {
    it('returns default styles when no accessibility settings', () => {
      const styles = getAccessibilityStyles({});

      expect(styles).toContain('font-family:');
      expect(styles).toContain('-apple-system');
      // Body should use system font, not OpenDyslexic
      expect(styles).toMatch(/body\s*\{[^}]*font-family:\s*-apple-system/);
      // Body should not have uppercase text transform (dyslexia feature)
      // Match the main body block (contains font-family), not the @media print one
      const bodyMatch = styles.match(/body\s*\{[^}]*font-family:[^}]+\}/);
      expect(bodyMatch).not.toBeNull();
      expect(bodyMatch![0]).not.toContain('text-transform: uppercase');
    });

    it('applies dyslexia font when enabled', () => {
      const styles = getAccessibilityStyles({ dyslexiaFont: true });

      // Body should use OpenDyslexic font (main body block, not @media print)
      expect(styles).toMatch(/body\s*\{[^}]*font-family:\s*'OpenDyslexic'/);
      // Body should have uppercase text transform for dyslexia
      // Match the main body block (contains font-family), not the @media print one
      const bodyMatch = styles.match(/body\s*\{[^}]*font-family:[^}]+\}/);
      expect(bodyMatch).not.toBeNull();
      expect(bodyMatch![0]).toContain('text-transform: uppercase');
    });

    it('applies larger font size for dyslexic users (1.4x)', () => {
      const defaultStyles = getAccessibilityStyles({});
      const dyslexiaStyles = getAccessibilityStyles({ dyslexiaFont: true });

      // Default: 1 * 1 * 1 * 16 = 16px
      expect(defaultStyles).toContain('font-size: 16px');

      // Dyslexia: 1 * 1.4 * 1 * 16 = 22.4px
      expect(dyslexiaStyles).toContain('font-size: 22.4px');
    });

    it('combines dyslexia and large text multipliers', () => {
      const styles = getAccessibilityStyles({
        dyslexiaFont: true,
        largeText: true,
      });

      // 1 * 1.4 * 1.2 * 16 = 26.88px
      expect(styles).toContain('font-size: 26.88px');
    });

    it('applies high contrast colors when enabled', () => {
      const styles = getAccessibilityStyles({ highContrast: true });

      expect(styles).toContain('background-color: #000000');
      expect(styles).toContain('color: #ffff00');
    });

    it('applies increased line height for dyslexia', () => {
      const styles = getAccessibilityStyles({
        increasedLineHeight: true,
        lineSpacing: 1.5,
      });

      expect(styles).toContain('line-height: 1.8');
    });

    it('applies extra letter spacing for dyslexia', () => {
      const styles = getAccessibilityStyles({ extraLetterSpacing: true });

      expect(styles).toContain('letter-spacing: 0.05em');
    });

    it('uses custom colors when provided', () => {
      const styles = getAccessibilityStyles({
        customBackgroundColor: '#f0f0f0',
        customTextColor: '#333333',
      });

      expect(styles).toContain('background-color: #f0f0f0');
      expect(styles).toContain('color: #333333');
    });
  });

  describe('generateAccessibleHtml', () => {
    const baseOptions = {
      title: 'Test Title',
      contentType: 'summary' as const,
      content: {
        topic: 'Test Topic',
        sections: [
          {
            title: 'Section 1',
            content: 'Section content',
            keyPoints: ['Point 1', 'Point 2'],
          },
        ],
      },
      accessibility: {},
    };

    it('generates valid HTML document', () => {
      const html = generateAccessibleHtml(baseOptions);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="it">');
      expect(html).toContain('<title>Test Title - MirrorBuddy</title>');
    });

    it('includes content type label', () => {
      const html = generateAccessibleHtml(baseOptions);

      expect(html).toContain('Riassunto');
    });

    it('includes date when showDate is true', () => {
      const html = generateAccessibleHtml({
        ...baseOptions,
        showDate: true,
      });

      // Should contain Italian date format
      expect(html).toMatch(/\d+\s+\w+\s+\d{4}/);
    });

    it('includes watermark when showWatermark is true', () => {
      const html = generateAccessibleHtml({
        ...baseOptions,
        showWatermark: true,
      });

      expect(html).toContain('MirrorBuddy');
      expect(html).toContain('class="footer"');
    });

    it('excludes watermark when showWatermark is false', () => {
      const html = generateAccessibleHtml({
        ...baseOptions,
        showWatermark: false,
      });

      expect(html).not.toContain('class="footer"');
    });

    it('shows accessibility indicator when settings applied', () => {
      const html = generateAccessibleHtml({
        ...baseOptions,
        accessibility: {
          dyslexiaFont: true,
          largeText: true,
        },
      });

      expect(html).toContain('class="a11y-indicator"');
      expect(html).toContain('Font dislessia');
      expect(html).toContain('Testo grande');
    });

    it('renders summary content correctly', () => {
      const html = generateAccessibleHtml(baseOptions);

      expect(html).toContain('Section 1');
      expect(html).toContain('Section content');
      expect(html).toContain('Point 1');
      expect(html).toContain('Point 2');
      expect(html).toContain('Punti chiave');
    });

    it('renders mindmap content correctly', () => {
      const html = generateAccessibleHtml({
        ...baseOptions,
        contentType: 'mindmap',
        content: [
          { id: 'root', label: 'Root Node', parentId: null },
          { id: 'child1', label: 'Child 1', parentId: 'root' },
        ],
      });

      expect(html).toContain('Root Node');
      expect(html).toContain('Child 1');
      expect(html).toContain('role="tree"');
    });

    it('renders flashcards content correctly', () => {
      const html = generateAccessibleHtml({
        ...baseOptions,
        contentType: 'flashcard',
        content: {
          cards: [
            { front: 'Question 1', back: 'Answer 1' },
            { front: 'Question 2', back: 'Answer 2' },
          ],
        },
      });

      expect(html).toContain('Question 1');
      expect(html).toContain('Answer 1');
      expect(html).toContain('class="flashcard"');
      expect(html).toContain('Domanda');
      expect(html).toContain('Risposta');
    });

    it('renders quiz content correctly', () => {
      const html = generateAccessibleHtml({
        ...baseOptions,
        contentType: 'quiz',
        content: {
          topic: 'Test Quiz',
          questions: [
            {
              question: 'What is 2+2?',
              options: ['3', '4', '5'],
              correctIndex: 1,
              explanation: 'Basic math',
            },
          ],
        },
      });

      expect(html).toContain('What is 2+2?');
      expect(html).toContain('Domanda 1');
      expect(html).toContain('(Corretta)');
      expect(html).toContain('Basic math');
    });

    it('renders timeline content correctly', () => {
      const html = generateAccessibleHtml({
        ...baseOptions,
        contentType: 'timeline',
        content: {
          topic: 'History',
          events: [
            { date: '1492', title: 'Discovery', description: 'Columbus sailed' },
          ],
        },
      });

      expect(html).toContain('1492');
      expect(html).toContain('Discovery');
      expect(html).toContain('Columbus sailed');
      expect(html).toContain('class="timeline"');
    });

    it('renders diagram content correctly', () => {
      const html = generateAccessibleHtml({
        ...baseOptions,
        contentType: 'diagram',
        content: {
          topic: 'Flow',
          diagramType: 'flowchart',
          mermaidCode: 'graph TD; A-->B;',
        },
      });

      expect(html).toContain('Flow');
      expect(html).toContain('Diagramma di flusso');
      expect(html).toContain('graph TD; A--&gt;B;');
    });

    it('escapes HTML in content', () => {
      const html = generateAccessibleHtml({
        ...baseOptions,
        content: {
          topic: 'Test <script>alert("xss")</script>',
          sections: [
            {
              title: 'Section <b>bold</b>',
              content: 'Content with <em>tags</em>',
              keyPoints: [],
            },
          ],
        },
      });

      // Topic should be escaped
      expect(html).not.toContain('<script>alert');
      expect(html).toContain('&lt;script&gt;');
      // Section title should be escaped
      expect(html).not.toContain('<b>bold</b>');
      expect(html).toContain('&lt;b&gt;');
    });

    it('uses semantic HTML for accessibility', () => {
      const html = generateAccessibleHtml(baseOptions);

      expect(html).toContain('role="main"');
      expect(html).toContain('<main');
      expect(html).toContain('<article');
      expect(html).toContain('<header');
    });
  });
});
