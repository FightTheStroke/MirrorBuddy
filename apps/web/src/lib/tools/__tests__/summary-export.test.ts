/**
 * Summary Export Unit Tests
 *
 * Tests for summary export utilities
 * Part of Issue #70: Real-time summary tool
 */

import { describe, it, expect } from 'vitest';
import {
  generateSummaryHtml,
  convertSummaryToMindmap,
  generateFlashcardsFromSummary,
} from '../summary-export';
import type { SummaryData } from '@/types/tools';

const mockSummaryData: SummaryData = {
  topic: 'La Fotosintesi',
  sections: [
    {
      title: 'Dove avviene',
      content: 'La fotosintesi avviene nelle foglie delle piante.',
      keyPoints: ['Nelle foglie', 'Nei cloroplasti'],
    },
    {
      title: 'Cosa serve',
      content: 'Per la fotosintesi servono acqua, luce e anidride carbonica.',
      keyPoints: ['Acqua', 'CO2', 'Luce solare'],
    },
  ],
  length: 'medium',
};

describe('Summary Export', () => {
  describe('generateSummaryHtml', () => {
    it('generates valid HTML with title', () => {
      const html = generateSummaryHtml(mockSummaryData);
      expect(html).toContain('La Fotosintesi');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('includes all sections', () => {
      const html = generateSummaryHtml(mockSummaryData);
      expect(html).toContain('Dove avviene');
      expect(html).toContain('Cosa serve');
    });

    it('includes section content', () => {
      const html = generateSummaryHtml(mockSummaryData);
      expect(html).toContain('La fotosintesi avviene nelle foglie');
    });

    it('includes key points as list items', () => {
      const html = generateSummaryHtml(mockSummaryData);
      expect(html).toContain('<li>');
      expect(html).toContain('Nelle foglie');
      expect(html).toContain('Nei cloroplasti');
    });

    it('includes length label when provided', () => {
      const html = generateSummaryHtml(mockSummaryData);
      expect(html).toContain('Riassunto Medio');
    });

    it('includes MirrorBuddy branding', () => {
      const html = generateSummaryHtml(mockSummaryData);
      expect(html).toContain('MirrorBuddy');
    });

    it('escapes HTML in content', () => {
      const dataWithHtml: SummaryData = {
        topic: '<script>alert("xss")</script>',
        sections: [{ title: 'Test', content: 'Content' }],
      };
      const html = generateSummaryHtml(dataWithHtml);
      expect(html).not.toContain('<script>alert("xss")</script>');
    });
  });

  describe('convertSummaryToMindmap', () => {
    it('returns correct topic', () => {
      const result = convertSummaryToMindmap(mockSummaryData);
      expect(result.topic).toBe('La Fotosintesi');
    });

    it('creates root node', () => {
      const result = convertSummaryToMindmap(mockSummaryData);
      const rootNode = result.nodes.find((n) => n.parentId === null);
      expect(rootNode).toBeDefined();
      expect(rootNode?.label).toBe('La Fotosintesi');
    });

    it('creates section nodes as children of root', () => {
      const result = convertSummaryToMindmap(mockSummaryData);
      const rootNode = result.nodes.find((n) => n.parentId === null);
      const sectionNodes = result.nodes.filter((n) => n.parentId === rootNode?.id);
      expect(sectionNodes).toHaveLength(2);
      expect(sectionNodes.map((n) => n.label)).toContain('Dove avviene');
      expect(sectionNodes.map((n) => n.label)).toContain('Cosa serve');
    });

    it('creates key point nodes as children of sections', () => {
      const result = convertSummaryToMindmap(mockSummaryData);
      // Total: 1 root + 2 sections + 5 key points = 8 nodes
      expect(result.nodes).toHaveLength(8);
    });

    it('handles empty sections', () => {
      const emptyData: SummaryData = { topic: 'Empty', sections: [] };
      const result = convertSummaryToMindmap(emptyData);
      expect(result.nodes).toHaveLength(1); // Just root
    });

    it('handles sections without key points', () => {
      const noKeyPointsData: SummaryData = {
        topic: 'Test',
        sections: [{ title: 'Section', content: 'Content' }],
      };
      const result = convertSummaryToMindmap(noKeyPointsData);
      expect(result.nodes).toHaveLength(2); // Root + 1 section
    });
  });

  describe('generateFlashcardsFromSummary', () => {
    it('returns correct topic', () => {
      const result = generateFlashcardsFromSummary(mockSummaryData);
      expect(result.topic).toBe('La Fotosintesi');
    });

    it('creates cards for sections with content', () => {
      const result = generateFlashcardsFromSummary(mockSummaryData);
      const sectionCard = result.cards.find((c) =>
        c.front.includes('Dove avviene')
      );
      expect(sectionCard).toBeDefined();
      expect(sectionCard?.back).toContain('La fotosintesi avviene');
    });

    it('creates cards for key points', () => {
      const result = generateFlashcardsFromSummary(mockSummaryData);
      // Each section: 1 content card + N key point cards
      // Section 1: 1 + 2 = 3, Section 2: 1 + 3 = 4 => Total: 7
      expect(result.cards.length).toBeGreaterThanOrEqual(5);
    });

    it('formats questions correctly', () => {
      const result = generateFlashcardsFromSummary(mockSummaryData);
      const hasQuestionFormat = result.cards.some((c) =>
        c.front.includes('Cosa sai su') || c.front.includes('Completa la frase')
      );
      expect(hasQuestionFormat).toBe(true);
    });

    it('handles empty sections', () => {
      const emptyData: SummaryData = { topic: 'Empty', sections: [] };
      const result = generateFlashcardsFromSummary(emptyData);
      expect(result.cards).toHaveLength(0);
    });

    it('handles sections without content', () => {
      const noContentData: SummaryData = {
        topic: 'Test',
        sections: [{ title: 'Section', content: '', keyPoints: ['Point 1'] }],
      };
      const result = generateFlashcardsFromSummary(noContentData);
      // Only 1 card for the key point (no content card since content is empty)
      expect(result.cards.length).toBeGreaterThanOrEqual(1);
    });
  });
});
