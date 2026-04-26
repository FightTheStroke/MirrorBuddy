/**
 * Tests for Mindmap Import Validation
 */

import { describe, it, expect } from 'vitest';
import { validateMindmap } from '../validation';
import type { MindmapData } from '../../mindmap-export';

describe('validateMindmap', () => {
  const validMindmap: MindmapData = {
    title: 'Test Mindmap',
    root: {
      id: 'root-1',
      text: 'Central Topic',
    },
  };

  it('returns valid for complete mindmap', () => {
    const result = validateMindmap(validMindmap);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when title is missing', () => {
    const mindmap = { ...validMindmap, title: '' };
    const result = validateMindmap(mindmap);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing title');
  });

  it('fails when root is missing', () => {
    const mindmap = { title: 'Test' } as MindmapData;
    const result = validateMindmap(mindmap);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing root node');
  });

  it('fails when root node is missing text', () => {
    const mindmap: MindmapData = {
      title: 'Test',
      root: { id: 'root-1', text: '' },
    };
    const result = validateMindmap(mindmap);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Root node missing text');
  });

  it('fails when root node is missing id', () => {
    const mindmap: MindmapData = {
      title: 'Test',
      root: { id: '', text: 'Topic' },
    };
    const result = validateMindmap(mindmap);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Node at root missing id');
  });

  it('validates child nodes recursively', () => {
    const mindmap: MindmapData = {
      title: 'Test',
      root: {
        id: 'root-1',
        text: 'Central',
        children: [
          { id: '', text: 'Child 1' }, // Missing id
          { id: 'child-2', text: '' }, // Missing text
        ],
      },
    };
    const result = validateMindmap(mindmap);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Node at root.children[0] missing id');
    expect(result.errors).toContain('Node at root.children[1] missing text');
  });

  it('validates deeply nested nodes', () => {
    const mindmap: MindmapData = {
      title: 'Test',
      root: {
        id: 'root-1',
        text: 'Central',
        children: [
          {
            id: 'child-1',
            text: 'Child 1',
            children: [
              { id: '', text: 'Grandchild' }, // Missing id
            ],
          },
        ],
      },
    };
    const result = validateMindmap(mindmap);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Node at root.children[0].children[0] missing id');
  });

  it('returns multiple errors at once', () => {
    const mindmap = { title: '', root: undefined } as unknown as MindmapData;
    const result = validateMindmap(mindmap);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('validates mindmap with valid nested structure', () => {
    const mindmap: MindmapData = {
      title: 'Complex Mindmap',
      root: {
        id: 'root',
        text: 'Main Topic',
        children: [
          {
            id: 'a',
            text: 'Branch A',
            children: [
              { id: 'a1', text: 'Leaf A1' },
              { id: 'a2', text: 'Leaf A2' },
            ],
          },
          {
            id: 'b',
            text: 'Branch B',
          },
        ],
      },
    };
    const result = validateMindmap(mindmap);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
