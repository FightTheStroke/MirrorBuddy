/**
 * Tests for Mindmap Content Parser
 */

import { describe, it, expect } from 'vitest';
import { extractMindmapSections } from '../mindmap-parser';

describe('extractMindmapSections', () => {
  it('always includes Mappa Concettuale heading', () => {
    const sections = extractMindmapSections({});
    expect(sections[0]).toEqual({
      type: 'heading',
      content: 'Mappa Concettuale',
      level: 2,
    });
  });

  it('extracts nodes array as list items', () => {
    const mindmap = {
      nodes: [
        { label: 'Concept A' },
        { text: 'Concept B' },
        { label: 'Concept C', text: 'Fallback' },
      ],
    };
    const sections = extractMindmapSections(mindmap);
    const list = sections.find(s => s.type === 'list');

    expect(list).toBeDefined();
    expect(list?.items).toContain('Concept A');
    expect(list?.items).toContain('Concept B');
  });

  it('filters out empty nodes', () => {
    const mindmap = {
      nodes: [
        { label: 'Valid' },
        { label: '' },
        { text: '' },
        {},
      ],
    };
    const sections = extractMindmapSections(mindmap);
    const list = sections.find(s => s.type === 'list');

    expect(list?.items).toHaveLength(1);
    expect(list?.items?.[0]).toBe('Valid');
  });

  it('extracts central topic as paragraph', () => {
    const mindmap = {
      central: { text: 'Main Topic' },
    };
    const sections = extractMindmapSections(mindmap);
    const paragraph = sections.find(s => s.type === 'paragraph');

    expect(paragraph).toBeDefined();
    expect(paragraph?.content).toContain('Main Topic');
  });

  it('handles missing central text', () => {
    const mindmap = {
      central: {},
    };
    const sections = extractMindmapSections(mindmap);
    const paragraph = sections.find(s => s.type === 'paragraph');

    expect(paragraph?.content).toContain('Non specificato');
  });

  it('extracts central children as list', () => {
    const mindmap = {
      central: {
        text: 'Center',
        children: [
          { text: 'Child 1' },
          { text: 'Child 2' },
        ],
      },
    };
    const sections = extractMindmapSections(mindmap);
    const lists = sections.filter(s => s.type === 'list');
    const childrenList = lists.find(l => l.content?.includes('correlati'));

    expect(childrenList).toBeDefined();
    expect(childrenList?.items).toContain('Child 1');
    expect(childrenList?.items).toContain('Child 2');
  });

  it('filters out empty children', () => {
    const mindmap = {
      central: {
        text: 'Center',
        children: [
          { text: 'Valid child' },
          { text: '' },
          {},
        ],
      },
    };
    const sections = extractMindmapSections(mindmap);
    const lists = sections.filter(s => s.type === 'list');
    const childrenList = lists.find(l => l.content?.includes('correlati'));

    expect(childrenList?.items).toHaveLength(1);
  });

  it('handles both nodes and central', () => {
    const mindmap = {
      nodes: [{ label: 'Node 1' }],
      central: { text: 'Topic', children: [{ text: 'Child' }] },
    };
    const sections = extractMindmapSections(mindmap);
    const lists = sections.filter(s => s.type === 'list');

    expect(lists.length).toBe(2);
  });

  it('handles empty nodes array', () => {
    const mindmap = { nodes: [] };
    const sections = extractMindmapSections(mindmap);
    const list = sections.find(s => s.type === 'list');

    // Should not create a list with empty items
    expect(list).toBeUndefined();
  });
});
