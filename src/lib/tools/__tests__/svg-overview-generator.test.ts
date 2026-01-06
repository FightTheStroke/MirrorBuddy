/**
 * Tests for SVG Overview Generator
 * @module tools/svg-overview-generator
 */

import { describe, it, expect, vi } from 'vitest';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  generateOverviewSVG,
  generateMermaidCode,
  parseTextToOverview,
  type OverviewData,
  type OverviewNode,
  type SVGGenerationOptions,
} from '../svg-overview-generator';

describe('SVG Overview Generator', () => {
  describe('generateOverviewSVG', () => {
    const sampleData: OverviewData = {
      title: 'Test Overview',
      subject: 'Mathematics',
      root: {
        id: 'root',
        label: 'Main Topic',
        type: 'main',
        children: [
          {
            id: 'section1',
            label: 'Section 1',
            type: 'section',
            children: [
              { id: 'concept1', label: 'Concept A', type: 'concept' },
              { id: 'concept2', label: 'Concept B', type: 'concept' },
            ],
          },
          {
            id: 'section2',
            label: 'Section 2',
            type: 'section',
          },
        ],
      },
    };

    it('should generate valid SVG with XML declaration', () => {
      const svg = generateOverviewSVG(sampleData);

      expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('</svg>');
    });

    it('should include the title in the SVG', () => {
      const svg = generateOverviewSVG(sampleData);

      expect(svg).toContain('Test Overview');
    });

    it('should include the subject badge when provided', () => {
      const svg = generateOverviewSVG(sampleData);

      expect(svg).toContain('Mathematics');
    });

    it('should use dark theme by default', () => {
      const svg = generateOverviewSVG(sampleData);

      expect(svg).toContain('#1e293b'); // Dark background
    });

    it('should support light theme', () => {
      const options: SVGGenerationOptions = { theme: 'light' };
      const svg = generateOverviewSVG(sampleData, options);

      expect(svg).toContain('#ffffff'); // Light background
    });

    it('should render all nodes', () => {
      const svg = generateOverviewSVG(sampleData);

      expect(svg).toContain('Main Topic');
      expect(svg).toContain('Section 1');
      expect(svg).toContain('Section 2');
      expect(svg).toContain('Concept A');
      expect(svg).toContain('Concept B');
    });

    it('should include connection paths', () => {
      const svg = generateOverviewSVG(sampleData);

      expect(svg).toContain('<path class="connection"');
    });

    it('should show icons when showIcons is true', () => {
      const options: SVGGenerationOptions = { showIcons: true };
      const svg = generateOverviewSVG(sampleData, options);

      expect(svg).toContain('🎯'); // Main icon
    });

    it('should hide icons when showIcons is false', () => {
      const options: SVGGenerationOptions = { showIcons: false };
      const svg = generateOverviewSVG(sampleData, options);

      expect(svg).not.toContain('🎯');
      expect(svg).not.toContain('📑');
    });

    it('should respect custom dimensions', () => {
      const options: SVGGenerationOptions = { width: 800, height: 600 };
      const svg = generateOverviewSVG(sampleData, options);

      expect(svg).toContain('width="800"');
      expect(svg).toContain('height="600"');
      expect(svg).toContain('viewBox="0 0 800 600"');
    });

    it('should truncate long labels', () => {
      const longLabelData: OverviewData = {
        title: 'Test',
        root: {
          id: 'root',
          label: 'This is a very long label that should be truncated to fit the node',
          type: 'main',
        },
      };
      const options: SVGGenerationOptions = { maxLabelLength: 20 };
      const svg = generateOverviewSVG(longLabelData, options);

      expect(svg).toContain('...');
      expect(svg).not.toContain('that should be truncated to fit the node');
    });

    it('should escape XML special characters', () => {
      const xmlCharsData: OverviewData = {
        title: 'Test <>&"\'',
        root: {
          id: 'root',
          label: 'Node with <special> & "chars"',
          type: 'main',
        },
      };
      const svg = generateOverviewSVG(xmlCharsData);

      expect(svg).toContain('&lt;');
      expect(svg).toContain('&gt;');
      expect(svg).toContain('&amp;');
      expect(svg).toContain('&quot;');
    });

    it('should use tree layout when specified', () => {
      const options: SVGGenerationOptions = { layout: 'tree' };
      const svg = generateOverviewSVG(sampleData, options);

      expect(svg).toContain('<svg');
      // Tree layout positions nodes differently but still generates valid SVG
    });

    it('should handle single node without children', () => {
      const singleNode: OverviewData = {
        title: 'Single',
        root: {
          id: 'root',
          label: 'Only Node',
          type: 'main',
        },
      };
      const svg = generateOverviewSVG(singleNode);

      expect(svg).toContain('Only Node');
      expect(svg).not.toContain('<path class="connection"');
    });
  });

  describe('generateMermaidCode', () => {
    const sampleData: OverviewData = {
      title: 'Test',
      root: {
        id: 'root',
        label: 'Main Topic',
        type: 'main',
        children: [
          {
            id: 'sec-1',
            label: 'Section 1',
            type: 'section',
            children: [
              { id: 'con-1', label: 'Concept', type: 'concept' },
            ],
          },
        ],
      },
    };

    it('should generate flowchart TD header', () => {
      const mermaid = generateMermaidCode(sampleData);

      expect(mermaid).toContain('flowchart TD');
    });

    it('should define class styles', () => {
      const mermaid = generateMermaidCode(sampleData);

      expect(mermaid).toContain('classDef main');
      expect(mermaid).toContain('classDef section');
      expect(mermaid).toContain('classDef concept');
      expect(mermaid).toContain('classDef detail');
    });

    it('should generate nodes with labels', () => {
      const mermaid = generateMermaidCode(sampleData);

      expect(mermaid).toContain('root["Main Topic"]');
      expect(mermaid).toContain('sec_1["Section 1"]');
      expect(mermaid).toContain('con_1["Concept"]');
    });

    it('should generate connections', () => {
      const mermaid = generateMermaidCode(sampleData);

      expect(mermaid).toContain('root --> sec_1');
      expect(mermaid).toContain('sec_1 --> con_1');
    });

    it('should assign class to nodes', () => {
      const mermaid = generateMermaidCode(sampleData);

      expect(mermaid).toContain('class root main');
      expect(mermaid).toContain('class sec_1 section');
      expect(mermaid).toContain('class con_1 concept');
    });

    it('should sanitize node IDs', () => {
      const specialIdData: OverviewData = {
        title: 'Test',
        root: {
          id: 'root-with-special.chars',
          label: 'Root',
          type: 'main',
        },
      };
      const mermaid = generateMermaidCode(specialIdData);

      expect(mermaid).toContain('root_with_special_chars["Root"]');
    });

    it('should truncate long labels', () => {
      const longData: OverviewData = {
        title: 'Test',
        root: {
          id: 'root',
          label: 'This is a very long label that exceeds the maximum length',
          type: 'main',
        },
      };
      const mermaid = generateMermaidCode(longData);

      // Label gets truncated to 30 chars in generateMermaidCode
      expect(mermaid).toContain('root["This is a very long label that"]');
      expect(mermaid.length).toBeLessThan(500); // Reasonable length
    });
  });

  describe('parseTextToOverview', () => {
    it('should parse markdown headers into sections', () => {
      const text = `
## Introduction
This is the introduction.

## Main Concepts
### Concept A
Details about A.

### Concept B
Details about B.
`;
      const result = parseTextToOverview('Study Guide', text);

      expect(result.title).toBe('Study Guide');
      expect(result.root.label).toBe('Study Guide');
      expect(result.root.type).toBe('main');
      expect(result.root.children).toHaveLength(2);
      expect(result.root.children?.[0].label).toBe('Introduction');
      expect(result.root.children?.[0].type).toBe('section');
      expect(result.root.children?.[1].label).toBe('Main Concepts');
    });

    it('should parse bullet points into details', () => {
      const text = `
## Section
### Concept
- Point 1
- Point 2
* Point 3
`;
      const result = parseTextToOverview('Test', text);

      const section = result.root.children?.[0];
      const concept = section?.children?.[0];
      expect(concept?.children).toHaveLength(3);
      expect(concept?.children?.[0].type).toBe('detail');
      expect(concept?.children?.[0].label).toBe('Point 1');
    });

    it('should include subject when provided', () => {
      const result = parseTextToOverview('Title', 'Content', 'History');

      expect(result.subject).toBe('History');
    });

    it('should handle text without markdown structure', () => {
      const plainText = `
This is just a paragraph of text.

And here is another paragraph with more content.

A third paragraph for good measure.
`;
      const result = parseTextToOverview('Plain Text', plainText);

      expect(result.root.children?.length).toBeGreaterThan(0);
      expect(result.root.children?.[0].type).toBe('concept');
    });

    it('should limit paragraphs to 5 when no structure found', () => {
      const manyParagraphs = Array(10)
        .fill(null)
        .map((_, i) => `Paragraph ${i + 1} with some content.`)
        .join('\n\n');

      const result = parseTextToOverview('Many Paragraphs', manyParagraphs);

      expect(result.root.children?.length).toBeLessThanOrEqual(5);
    });

    it('should truncate long paragraph labels', () => {
      const longParagraph = 'A'.repeat(100);
      const result = parseTextToOverview('Long', `${longParagraph}\n\n${longParagraph}`);

      const firstChild = result.root.children?.[0];
      expect(firstChild?.label.length).toBeLessThanOrEqual(53); // 50 + "..."
    });

    it('should assign unique IDs to nodes', () => {
      const text = `
## Section 1
### Concept
## Section 2
### Concept
`;
      const result = parseTextToOverview('Test', text);

      const allIds = new Set<string>();
      function collectIds(node: OverviewNode) {
        expect(allIds.has(node.id)).toBe(false);
        allIds.add(node.id);
        node.children?.forEach(collectIds);
      }
      collectIds(result.root);
    });
  });

  describe('edge cases', () => {
    it('should handle empty children array', () => {
      const data: OverviewData = {
        title: 'Test',
        root: {
          id: 'root',
          label: 'Root',
          type: 'main',
          children: [],
        },
      };
      const svg = generateOverviewSVG(data);

      expect(svg).toContain('Root');
      expect(svg).not.toContain('<path class="connection"');
    });

    it('should handle deeply nested structure', () => {
      const deepData: OverviewData = {
        title: 'Deep',
        root: {
          id: 'l0',
          label: 'Level 0',
          type: 'main',
          children: [
            {
              id: 'l1',
              label: 'Level 1',
              type: 'section',
              children: [
                {
                  id: 'l2',
                  label: 'Level 2',
                  type: 'concept',
                  children: [
                    {
                      id: 'l3',
                      label: 'Level 3',
                      type: 'detail',
                      children: [
                        { id: 'l4', label: 'Level 4', type: 'detail' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const svg = generateOverviewSVG(deepData);

      expect(svg).toContain('Level 0');
      expect(svg).toContain('Level 4');
    });

    it('should handle empty text input', () => {
      const result = parseTextToOverview('Empty', '');

      expect(result.root.label).toBe('Empty');
      expect(result.root.children?.length).toBe(0);
    });

    it('should handle whitespace-only text', () => {
      const result = parseTextToOverview('Whitespace', '   \n\n   \t   ');

      expect(result.root.children?.length).toBe(0);
    });
  });
});
