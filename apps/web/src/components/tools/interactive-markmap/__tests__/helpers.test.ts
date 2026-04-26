/**
 * Tests for Interactive MarkMap Helpers
 */

import { describe, it, expect } from 'vitest';
import {
  markdownToNodes,
  nodesToMarkdown,
  findNodeByLabel,
  cloneNodes,
} from '../helpers';
import type { MindmapNode } from '../types';

describe('interactive-markmap-helpers', () => {
  describe('markdownToNodes', () => {
    it('parses simple markdown headers', () => {
      const markdown = `# Title
## Topic A
## Topic B`;
      const result = markdownToNodes(markdown);

      expect(result.length).toBe(2);
      expect(result[0].label).toBe('Topic A');
      expect(result[1].label).toBe('Topic B');
    });

    it('parses nested headers', () => {
      const markdown = `# Title
## Parent
### Child 1
### Child 2`;
      const result = markdownToNodes(markdown);

      expect(result.length).toBe(1);
      expect(result[0].label).toBe('Parent');
      expect(result[0].children?.length).toBe(2);
      expect(result[0].children?.[0].label).toBe('Child 1');
      expect(result[0].children?.[1].label).toBe('Child 2');
    });

    it('parses deeply nested structure', () => {
      const markdown = `# Root
## Level 1
### Level 2
#### Level 3`;
      const result = markdownToNodes(markdown);

      expect(result[0].label).toBe('Level 1');
      expect(result[0].children?.[0].label).toBe('Level 2');
      expect(result[0].children?.[0].children?.[0].label).toBe('Level 3');
    });

    it('handles empty input', () => {
      const result = markdownToNodes('');
      expect(result).toEqual([]);
    });

    it('handles whitespace-only lines', () => {
      const markdown = `# Title

## Topic A

## Topic B`;
      const result = markdownToNodes(markdown);

      expect(result.length).toBe(2);
    });

    it('ignores non-header lines', () => {
      const markdown = `# Title
## Topic A
This is body text
## Topic B`;
      const result = markdownToNodes(markdown);

      expect(result.length).toBe(2);
    });

    it('generates unique IDs for nodes', () => {
      const markdown = `# Title
## Topic A
## Topic B`;
      const result = markdownToNodes(markdown);

      expect(result[0].id).not.toBe(result[1].id);
      expect(result[0].id.length).toBe(8);
    });
  });

  describe('nodesToMarkdown', () => {
    it('converts single node to markdown', () => {
      const nodes: MindmapNode[] = [
        { id: '1', label: 'Topic A', children: [] },
      ];
      const result = nodesToMarkdown(nodes, 'My Title');

      expect(result).toContain('# My Title');
      expect(result).toContain('## Topic A');
    });

    it('converts nested nodes', () => {
      const nodes: MindmapNode[] = [
        {
          id: '1',
          label: 'Parent',
          children: [
            { id: '2', label: 'Child', children: [] },
          ],
        },
      ];
      const result = nodesToMarkdown(nodes, 'Title');

      expect(result).toContain('## Parent');
      expect(result).toContain('### Child');
    });

    it('handles multiple top-level nodes', () => {
      const nodes: MindmapNode[] = [
        { id: '1', label: 'A', children: [] },
        { id: '2', label: 'B', children: [] },
        { id: '3', label: 'C', children: [] },
      ];
      const result = nodesToMarkdown(nodes, 'Title');

      expect(result).toContain('## A');
      expect(result).toContain('## B');
      expect(result).toContain('## C');
    });

    it('handles empty nodes array', () => {
      const result = nodesToMarkdown([], 'Empty');
      expect(result).toBe('# Empty\n');
    });

    it('handles nodes without children property', () => {
      const nodes: MindmapNode[] = [
        { id: '1', label: 'No Children' } as MindmapNode,
      ];
      const result = nodesToMarkdown(nodes, 'Title');

      expect(result).toContain('## No Children');
    });
  });

  describe('findNodeByLabel', () => {
    const testNodes: MindmapNode[] = [
      {
        id: '1',
        label: 'Mathematics',
        children: [
          {
            id: '2',
            label: 'Algebra',
            children: [
              { id: '3', label: 'Linear Equations', children: [] },
            ],
          },
          { id: '4', label: 'Geometry', children: [] },
        ],
      },
      { id: '5', label: 'Science', children: [] },
    ];

    it('finds top-level node', () => {
      const result = findNodeByLabel(testNodes, 'Mathematics');

      expect(result).not.toBeNull();
      expect(result?.node.id).toBe('1');
      expect(result?.parent).toBeNull();
      expect(result?.index).toBe(0);
    });

    it('finds nested node', () => {
      const result = findNodeByLabel(testNodes, 'Algebra');

      expect(result).not.toBeNull();
      expect(result?.node.id).toBe('2');
      expect(result?.parent?.id).toBe('1');
    });

    it('finds deeply nested node', () => {
      const result = findNodeByLabel(testNodes, 'Linear');

      expect(result).not.toBeNull();
      expect(result?.node.label).toBe('Linear Equations');
    });

    it('performs case-insensitive search', () => {
      const result = findNodeByLabel(testNodes, 'GEOMETRY');

      expect(result).not.toBeNull();
      expect(result?.node.label).toBe('Geometry');
    });

    it('performs partial match', () => {
      const result = findNodeByLabel(testNodes, 'math');

      expect(result).not.toBeNull();
      expect(result?.node.label).toBe('Mathematics');
    });

    it('returns null for non-existent label', () => {
      const result = findNodeByLabel(testNodes, 'Physics');
      expect(result).toBeNull();
    });

    it('handles empty nodes array', () => {
      const result = findNodeByLabel([], 'anything');
      expect(result).toBeNull();
    });

    it('trims whitespace from search label', () => {
      const result = findNodeByLabel(testNodes, '  Science  ');

      expect(result).not.toBeNull();
      expect(result?.node.label).toBe('Science');
    });
  });

  describe('cloneNodes', () => {
    it('creates a deep copy', () => {
      const original: MindmapNode[] = [
        { id: '1', label: 'A', children: [] },
      ];
      const cloned = cloneNodes(original);

      // Modify clone
      cloned[0].label = 'Modified';

      // Original should be unchanged
      expect(original[0].label).toBe('A');
    });

    it('clones nested children', () => {
      const original: MindmapNode[] = [
        {
          id: '1',
          label: 'Parent',
          children: [
            { id: '2', label: 'Child', children: [] },
          ],
        },
      ];
      const cloned = cloneNodes(original);

      cloned[0].children![0].label = 'Modified Child';

      expect(original[0].children![0].label).toBe('Child');
    });

    it('handles empty array', () => {
      const result = cloneNodes([]);
      expect(result).toEqual([]);
    });

    it('preserves all node properties', () => {
      const original: MindmapNode[] = [
        {
          id: 'abc123',
          label: 'Test Node',
          children: [],
          color: '#FF0000',
          collapsed: true,
        } as MindmapNode & { color: string; collapsed: boolean },
      ];
      const cloned = cloneNodes(original);

      expect((cloned[0] as MindmapNode & { color: string }).color).toBe('#FF0000');
      expect((cloned[0] as MindmapNode & { collapsed: boolean }).collapsed).toBe(true);
    });
  });
});
