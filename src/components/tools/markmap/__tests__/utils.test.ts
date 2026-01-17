/**
 * Tests for MarkMap Renderer Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  nodesToMarkdown,
  createMindmapFromTopics,
  createMindmapFromMarkdown,
} from '../utils';
import type { MindmapNode } from '../types';

describe('markmap-utils', () => {
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

    it('handles deeply nested structure', () => {
      const nodes: MindmapNode[] = [
        {
          id: '1',
          label: 'Level 1',
          children: [
            {
              id: '2',
              label: 'Level 2',
              children: [
                { id: '3', label: 'Level 3', children: [] },
              ],
            },
          ],
        },
      ];
      const result = nodesToMarkdown(nodes, 'Deep');

      expect(result).toContain('## Level 1');
      expect(result).toContain('### Level 2');
      expect(result).toContain('#### Level 3');
    });

    it('handles empty nodes array', () => {
      const result = nodesToMarkdown([], 'Empty');
      expect(result).toBe('# Empty\n');
    });

    it('handles nodes without children array', () => {
      const nodes: MindmapNode[] = [
        { id: '1', label: 'No Children' } as MindmapNode,
      ];
      const result = nodesToMarkdown(nodes, 'Title');

      expect(result).toContain('## No Children');
    });

    it('preserves node labels with special characters', () => {
      const nodes: MindmapNode[] = [
        { id: '1', label: 'Math: x² + y² = r²', children: [] },
      ];
      const result = nodesToMarkdown(nodes, 'Formulas');

      expect(result).toContain('## Math: x² + y² = r²');
    });
  });

  describe('createMindmapFromTopics', () => {
    it('creates mindmap from simple topics', () => {
      const topics = [
        { name: 'Topic A' },
        { name: 'Topic B' },
      ];
      const result = createMindmapFromTopics('My Map', topics);

      expect(result.title).toBe('My Map');
      expect(result.nodes.length).toBe(2);
      expect(result.nodes[0].label).toBe('Topic A');
      expect(result.nodes[1].label).toBe('Topic B');
    });

    it('creates mindmap with subtopics', () => {
      const topics = [
        { name: 'Math', subtopics: ['Algebra', 'Geometry'] },
      ];
      const result = createMindmapFromTopics('Education', topics);

      expect(result.nodes[0].label).toBe('Math');
      expect(result.nodes[0].children?.length).toBe(2);
      expect(result.nodes[0].children?.[0].label).toBe('Algebra');
      expect(result.nodes[0].children?.[1].label).toBe('Geometry');
    });

    it('generates unique IDs for nodes', () => {
      const topics = [
        { name: 'A', subtopics: ['A1', 'A2'] },
        { name: 'B', subtopics: ['B1'] },
      ];
      const result = createMindmapFromTopics('Test', topics);

      expect(result.nodes[0].id).toBe('topic-0');
      expect(result.nodes[1].id).toBe('topic-1');
      expect(result.nodes[0].children?.[0].id).toBe('topic-0-sub-0');
      expect(result.nodes[0].children?.[1].id).toBe('topic-0-sub-1');
    });

    it('handles empty topics array', () => {
      const result = createMindmapFromTopics('Empty', []);

      expect(result.title).toBe('Empty');
      expect(result.nodes).toEqual([]);
    });

    it('handles topics without subtopics', () => {
      const topics = [
        { name: 'Topic' },
      ];
      const result = createMindmapFromTopics('Simple', topics);

      expect(result.nodes[0].children).toBeUndefined();
    });

    it('handles empty subtopics array', () => {
      const topics = [
        { name: 'Topic', subtopics: [] },
      ];
      const result = createMindmapFromTopics('Test', topics);

      expect(result.nodes[0].children).toEqual([]);
    });
  });

  describe('createMindmapFromMarkdown', () => {
    it('returns title and markdown unchanged', () => {
      const markdown = '## Topic A\n## Topic B';
      const result = createMindmapFromMarkdown('My Title', markdown);

      expect(result.title).toBe('My Title');
      expect(result.markdown).toBe(markdown);
    });

    it('handles empty markdown', () => {
      const result = createMindmapFromMarkdown('Empty', '');

      expect(result.title).toBe('Empty');
      expect(result.markdown).toBe('');
    });

    it('preserves complex markdown', () => {
      const markdown = `## Main Topic
### Subtopic 1
### Subtopic 2
#### Deep nested`;
      const result = createMindmapFromMarkdown('Complex', markdown);

      expect(result.markdown).toBe(markdown);
    });
  });
});
