// ============================================================================
// MINDMAP UTILS TESTS
// Tests for conversion utilities between parentId and children formats
// ADR: 0020-mindmap-data-structure-fix.md
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  convertParentIdToChildren,
  convertChildrenToParentId,
  generateMarkdownFromFlatNodes,
  generateMarkdownFromTree,
  detectNodeFormat,
  type FlatNode,
  type TreeNode,
} from '../mindmap-utils';

describe('mindmap-utils', () => {
  // ============================================================================
  // convertParentIdToChildren
  // ============================================================================

  describe('convertParentIdToChildren', () => {
    it('should convert flat nodes to tree structure', () => {
      const flat: FlatNode[] = [
        { id: '1', label: 'Root', parentId: null },
        { id: '2', label: 'Child 1', parentId: '1' },
        { id: '3', label: 'Child 2', parentId: '1' },
        { id: '4', label: 'Grandchild', parentId: '2' },
      ];

      const tree = convertParentIdToChildren(flat);

      expect(tree).toHaveLength(1);
      expect(tree[0].label).toBe('Root');
      expect(tree[0].children).toHaveLength(2);
      expect(tree[0].children![0].label).toBe('Child 1');
      expect(tree[0].children![0].children).toHaveLength(1);
      expect(tree[0].children![0].children![0].label).toBe('Grandchild');
    });

    it('should handle multiple root nodes', () => {
      const flat: FlatNode[] = [
        { id: '1', label: 'Root 1', parentId: null },
        { id: '2', label: 'Root 2', parentId: null },
        { id: '3', label: 'Child of 1', parentId: '1' },
        { id: '4', label: 'Child of 2', parentId: '2' },
      ];

      const tree = convertParentIdToChildren(flat);

      expect(tree).toHaveLength(2);
      expect(tree[0].label).toBe('Root 1');
      expect(tree[1].label).toBe('Root 2');
      expect(tree[0].children![0].label).toBe('Child of 1');
      expect(tree[1].children![0].label).toBe('Child of 2');
    });

    it('should handle empty input', () => {
      expect(convertParentIdToChildren([])).toEqual([]);
    });

    it('should treat orphan nodes as roots', () => {
      const flat: FlatNode[] = [
        { id: '1', label: 'Orphan', parentId: 'nonexistent' },
      ];

      const tree = convertParentIdToChildren(flat);

      expect(tree).toHaveLength(1);
      expect(tree[0].label).toBe('Orphan');
    });

    it('should handle parentId as empty string', () => {
      const flat: FlatNode[] = [
        { id: '1', label: 'Root with empty parentId', parentId: '' },
      ];

      const tree = convertParentIdToChildren(flat);

      expect(tree).toHaveLength(1);
      expect(tree[0].label).toBe('Root with empty parentId');
    });

    it('should handle parentId as "null" string', () => {
      const flat: FlatNode[] = [
        { id: '1', label: 'Root with string null', parentId: 'null' },
      ];

      const tree = convertParentIdToChildren(flat);

      expect(tree).toHaveLength(1);
      expect(tree[0].label).toBe('Root with string null');
    });

    it('should preserve optional properties', () => {
      const flat: FlatNode[] = [
        { id: '1', label: 'Colored Node', parentId: null, color: '#ff0000', icon: '📚' },
      ];

      const tree = convertParentIdToChildren(flat);

      expect(tree[0].color).toBe('#ff0000');
      expect(tree[0].icon).toBe('📚');
    });

    it('should clean up empty children arrays', () => {
      const flat: FlatNode[] = [
        { id: '1', label: 'Leaf Node', parentId: null },
      ];

      const tree = convertParentIdToChildren(flat);

      // Leaf nodes should not have children property
      expect(tree[0].children).toBeUndefined();
    });

    it('should handle deeply nested structures', () => {
      const flat: FlatNode[] = [
        { id: '1', label: 'Level 1', parentId: null },
        { id: '2', label: 'Level 2', parentId: '1' },
        { id: '3', label: 'Level 3', parentId: '2' },
        { id: '4', label: 'Level 4', parentId: '3' },
        { id: '5', label: 'Level 5', parentId: '4' },
      ];

      const tree = convertParentIdToChildren(flat);

      expect(tree[0].children![0].children![0].children![0].children![0].label).toBe('Level 5');
    });
  });

  // ============================================================================
  // convertChildrenToParentId
  // ============================================================================

  describe('convertChildrenToParentId', () => {
    it('should flatten tree to parentId format', () => {
      const tree: TreeNode[] = [
        {
          id: '1',
          label: 'Root',
          children: [
            { id: '2', label: 'Child' },
          ],
        },
      ];

      const flat = convertChildrenToParentId(tree);

      expect(flat).toHaveLength(2);
      expect(flat[0]).toEqual({
        id: '1',
        label: 'Root',
        parentId: null,
        color: undefined,
        icon: undefined,
      });
      expect(flat[1]).toEqual({
        id: '2',
        label: 'Child',
        parentId: '1',
        color: undefined,
        icon: undefined,
      });
    });

    it('should handle multiple roots', () => {
      const tree: TreeNode[] = [
        { id: '1', label: 'Root 1' },
        { id: '2', label: 'Root 2' },
      ];

      const flat = convertChildrenToParentId(tree);

      expect(flat).toHaveLength(2);
      expect(flat[0].parentId).toBeNull();
      expect(flat[1].parentId).toBeNull();
    });

    it('should handle deeply nested tree', () => {
      const tree: TreeNode[] = [
        {
          id: '1',
          label: 'L1',
          children: [
            {
              id: '2',
              label: 'L2',
              children: [
                { id: '3', label: 'L3' },
              ],
            },
          ],
        },
      ];

      const flat = convertChildrenToParentId(tree);

      expect(flat).toHaveLength(3);
      expect(flat[0].parentId).toBeNull();
      expect(flat[1].parentId).toBe('1');
      expect(flat[2].parentId).toBe('2');
    });

    it('should preserve optional properties', () => {
      const tree: TreeNode[] = [
        { id: '1', label: 'Node', color: '#ff0000', icon: '📚' },
      ];

      const flat = convertChildrenToParentId(tree);

      expect(flat[0].color).toBe('#ff0000');
      expect(flat[0].icon).toBe('📚');
    });
  });

  // ============================================================================
  // generateMarkdownFromFlatNodes
  // ============================================================================

  describe('generateMarkdownFromFlatNodes', () => {
    it('should generate proper markdown hierarchy', () => {
      const flat: FlatNode[] = [
        { id: '1', label: 'Geografia', parentId: null },
        { id: '2', label: 'Posizione', parentId: '1' },
        { id: '3', label: 'Nord-Ovest', parentId: '2' },
      ];

      const md = generateMarkdownFromFlatNodes('La Liguria', flat);

      expect(md).toContain('# La Liguria');
      expect(md).toContain('## Geografia');
      expect(md).toContain('### Posizione');
      expect(md).toContain('#### Nord-Ovest');
    });

    it('should handle multiple branches', () => {
      const flat: FlatNode[] = [
        { id: '1', label: 'Branch A', parentId: null },
        { id: '2', label: 'Branch B', parentId: null },
        { id: '3', label: 'A-1', parentId: '1' },
        { id: '4', label: 'B-1', parentId: '2' },
      ];

      const md = generateMarkdownFromFlatNodes('Multi-Branch', flat);

      expect(md).toContain('## Branch A');
      expect(md).toContain('## Branch B');
      expect(md).toContain('### A-1');
      expect(md).toContain('### B-1');
    });
  });

  // ============================================================================
  // generateMarkdownFromTree
  // ============================================================================

  describe('generateMarkdownFromTree', () => {
    it('should generate markdown from tree structure', () => {
      const tree: TreeNode[] = [
        {
          id: '1',
          label: 'Topic',
          children: [
            { id: '2', label: 'Subtopic' },
          ],
        },
      ];

      const md = generateMarkdownFromTree('Title', tree);

      expect(md).toContain('# Title');
      expect(md).toContain('## Topic');
      expect(md).toContain('### Subtopic');
    });

    it('should cap heading level at h6', () => {
      const tree: TreeNode[] = [
        {
          id: '1',
          label: 'L1',
          children: [
            {
              id: '2',
              label: 'L2',
              children: [
                {
                  id: '3',
                  label: 'L3',
                  children: [
                    {
                      id: '4',
                      label: 'L4',
                      children: [
                        {
                          id: '5',
                          label: 'L5',
                          children: [
                            {
                              id: '6',
                              label: 'L6',
                              children: [
                                { id: '7', label: 'L7' },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const md = generateMarkdownFromTree('Deep', tree);

      // Should not have more than 6 # symbols
      expect(md).not.toMatch(/#######/);
      // L6 and L7 should both be h6
      expect(md).toContain('###### L6');
      expect(md).toContain('###### L7');
    });
  });

  // ============================================================================
  // detectNodeFormat
  // ============================================================================

  describe('detectNodeFormat', () => {
    it('should detect parentId format', () => {
      const nodes = [{ id: '1', label: 'Test', parentId: null }];
      expect(detectNodeFormat(nodes)).toBe('parentId');
    });

    it('should detect children format', () => {
      const nodes = [{ id: '1', label: 'Test', children: [] }];
      expect(detectNodeFormat(nodes)).toBe('children');
    });

    it('should return unknown for empty array', () => {
      expect(detectNodeFormat([])).toBe('unknown');
    });

    it('should return unknown for nodes without parentId or children', () => {
      const nodes = [{ id: '1', label: 'Test' }];
      expect(detectNodeFormat(nodes)).toBe('unknown');
    });
  });

  // ============================================================================
  // Round-trip conversion
  // ============================================================================

  describe('Round-trip conversion', () => {
    it('should preserve structure through parentId -> children -> parentId', () => {
      const original: FlatNode[] = [
        { id: '1', label: 'Root', parentId: null },
        { id: '2', label: 'Child 1', parentId: '1' },
        { id: '3', label: 'Child 2', parentId: '1' },
        { id: '4', label: 'Grandchild', parentId: '2' },
      ];

      const tree = convertParentIdToChildren(original);
      const backToFlat = convertChildrenToParentId(tree);

      // Check same number of nodes
      expect(backToFlat).toHaveLength(original.length);

      // Check structure is preserved
      expect(backToFlat.find(n => n.id === '1')?.parentId).toBeNull();
      expect(backToFlat.find(n => n.id === '2')?.parentId).toBe('1');
      expect(backToFlat.find(n => n.id === '3')?.parentId).toBe('1');
      expect(backToFlat.find(n => n.id === '4')?.parentId).toBe('2');
    });
  });
});
