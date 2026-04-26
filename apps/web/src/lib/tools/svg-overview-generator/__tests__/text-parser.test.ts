/**
 * Text Parser Tests for SVG Overview Generator
 */

import { describe, it, expect } from 'vitest';
import { parseTextToOverview } from '../text-parser';

describe('parseTextToOverview', () => {
  it('should parse text with markdown headers', () => {
    const text = `## Introduction
This is intro content

## Main Topic
More content here

### Subtopic
- Detail 1
- Detail 2`;

    const result = parseTextToOverview('Test Title', text, 'Math');

    expect(result.title).toBe('Test Title');
    expect(result.subject).toBe('Math');
    expect(result.root.id).toBe('root');
    expect(result.root.label).toBe('Test Title');
    expect(result.root.type).toBe('main');
    expect(result.root.children).toBeDefined();
    expect(result.root.children!.length).toBeGreaterThan(0);
  });

  it('should create sections from ## headers', () => {
    const text = `## Section One
Content 1

## Section Two
Content 2`;

    const result = parseTextToOverview('Title', text);

    expect(result.root.children).toHaveLength(2);
    expect(result.root.children![0].label).toBe('Section One');
    expect(result.root.children![0].type).toBe('section');
    expect(result.root.children![1].label).toBe('Section Two');
  });

  it('should create concepts from ### headers inside sections', () => {
    const text = `## Main Section
### Concept A
### Concept B`;

    const result = parseTextToOverview('Title', text);

    expect(result.root.children).toHaveLength(1);
    const section = result.root.children![0];
    expect(section.children).toHaveLength(2);
    expect(section.children![0].label).toBe('Concept A');
    expect(section.children![0].type).toBe('concept');
  });

  it('should add ### concepts directly to root when no section exists', () => {
    const text = `### Orphan Concept
Some content`;

    const result = parseTextToOverview('Title', text);

    // Concept should be added directly to root
    expect(result.root.children!.some((c) => c.label === 'Orphan Concept')).toBe(true);
    expect(result.root.children!.find((c) => c.label === 'Orphan Concept')?.type).toBe('concept');
  });

  it('should add bullet points as details under concepts', () => {
    const text = `## Section
### Concept
- Detail 1
- Detail 2
* Detail 3`;

    const result = parseTextToOverview('Title', text);

    const section = result.root.children![0];
    const concept = section.children![0];
    expect(concept.children).toHaveLength(3);
    expect(concept.children![0].type).toBe('detail');
    expect(concept.children![0].label).toBe('Detail 1');
    expect(concept.children![2].label).toBe('Detail 3');
  });

  it('should add details directly to section when no concept exists', () => {
    const text = `## Section
- Direct detail`;

    const result = parseTextToOverview('Title', text);

    const section = result.root.children![0];
    expect(section.children).toHaveLength(1);
    expect(section.children![0].type).toBe('detail');
    expect(section.children![0].label).toBe('Direct detail');
  });

  it('should handle empty text with paragraph fallback', () => {
    const text = '';

    const result = parseTextToOverview('Empty Title', text);

    expect(result.title).toBe('Empty Title');
    expect(result.root.children?.length).toBe(0);
  });

  it('should create paragraphs when no structure found', () => {
    const text = `First paragraph with content.

Second paragraph with more content.

Third paragraph here.`;

    const result = parseTextToOverview('Plain Text', text);

    // Should create paragraph-based nodes
    expect(result.root.children!.length).toBeGreaterThan(0);
    expect(result.root.children![0].type).toBe('concept');
  });

  it('should truncate long paragraph labels', () => {
    const longText = 'A'.repeat(100);
    const text = longText;

    const result = parseTextToOverview('Long Text', text);

    // Paragraphs are truncated to 50 chars + ...
    const firstChild = result.root.children![0];
    expect(firstChild.label.length).toBeLessThanOrEqual(53); // 50 + '...'
    expect(firstChild.label).toContain('...');
  });

  it('should handle mixed content with all node types', () => {
    const text = `## Section A
### Concept 1
- Detail 1
- Detail 2
### Concept 2
## Section B
### Concept 3`;

    const result = parseTextToOverview('Mixed', text);

    expect(result.root.children).toHaveLength(2);

    const sectionA = result.root.children![0];
    expect(sectionA.label).toBe('Section A');
    expect(sectionA.children).toHaveLength(2);

    const concept1 = sectionA.children![0];
    expect(concept1.label).toBe('Concept 1');
    expect(concept1.children).toHaveLength(2);
  });

  it('should handle subject parameter', () => {
    const result = parseTextToOverview('Title', '## Test', 'Physics');

    expect(result.subject).toBe('Physics');
  });

  it('should handle undefined subject', () => {
    const result = parseTextToOverview('Title', '## Test');

    expect(result.subject).toBeUndefined();
  });

  it('should filter empty lines', () => {
    const text = `

## Section


Content

`;

    const result = parseTextToOverview('Title', text);

    // Should still parse correctly despite empty lines
    expect(result.root.children!.length).toBeGreaterThan(0);
    expect(result.root.children![0].label).toBe('Section');
  });

  it('should limit paragraphs to 5 when using fallback', () => {
    const paragraphs = Array.from({ length: 10 }, (_, i) => `Paragraph ${i + 1}`).join('\n\n');

    const result = parseTextToOverview('Many Paragraphs', paragraphs);

    // Should create max 5 paragraph nodes
    expect(result.root.children!.length).toBeLessThanOrEqual(5);
  });

  it('should generate unique IDs for all nodes', () => {
    const text = `## Section 1
### Concept 1
- Detail 1
## Section 2
### Concept 2
- Detail 2`;

    const result = parseTextToOverview('Title', text);

    // Collect all IDs
    const ids = new Set<string>();
    function collectIds(node: { id: string; children?: Array<{ id: string; children?: Array<{ id: string }> }> }) {
      ids.add(node.id);
      node.children?.forEach(collectIds);
    }
    collectIds(result.root);

    // All IDs should be unique - no duplicates
    const idArray = Array.from(ids);
    expect(new Set(idArray).size).toBe(idArray.length);
  });
});
