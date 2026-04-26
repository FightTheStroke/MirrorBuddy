/**
 * Tests for Summary Content Parser
 */

import { describe, it, expect } from 'vitest';
import { extractSummarySections } from '../summary-parser';

describe('extractSummarySections', () => {
  it('always includes Riassunto heading', () => {
    const sections = extractSummarySections('');
    expect(sections[0]).toEqual({
      type: 'heading',
      content: 'Riassunto',
      level: 2,
    });
  });

  it('parses level 1 headings', () => {
    const sections = extractSummarySections('# Main Title');
    const heading = sections.find(s => s.content === 'Main Title');

    expect(heading).toBeDefined();
    expect(heading?.type).toBe('heading');
    expect(heading?.level).toBe(1);
  });

  it('parses level 2 headings', () => {
    const sections = extractSummarySections('## Section Title');
    const heading = sections.find(s => s.content === 'Section Title');

    expect(heading).toBeDefined();
    expect(heading?.level).toBe(2);
  });

  it('parses level 3 headings', () => {
    const sections = extractSummarySections('### Subsection');
    const heading = sections.find(s => s.content === 'Subsection');

    expect(heading).toBeDefined();
    expect(heading?.level).toBe(3);
  });

  it('parses paragraphs', () => {
    const sections = extractSummarySections('This is a paragraph.\n\nAnother paragraph.');
    const paragraphs = sections.filter(s => s.type === 'paragraph');

    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0].content).toBe('This is a paragraph.');
    expect(paragraphs[1].content).toBe('Another paragraph.');
  });

  it('parses list items with dash', () => {
    const sections = extractSummarySections('- First item\n- Second item');
    const lists = sections.filter(s => s.type === 'list');

    expect(lists.length).toBeGreaterThan(0);
    expect(lists[0].items?.[0]).toBe('First item');
  });

  it('parses list items with asterisk', () => {
    const sections = extractSummarySections('* Item one');
    const lists = sections.filter(s => s.type === 'list');

    expect(lists.length).toBeGreaterThan(0);
    expect(lists[0].items?.[0]).toBe('Item one');
  });

  it('parses blockquotes', () => {
    const sections = extractSummarySections('> This is a quote');
    const quote = sections.find(s => s.type === 'quote');

    expect(quote).toBeDefined();
    expect(quote?.content).toBe('This is a quote');
  });

  it('handles mixed content', () => {
    const content = `# Title

Introduction paragraph.

## Section

- Point 1
- Point 2

> Quote here

Conclusion.`;

    const sections = extractSummarySections(content);
    const types = sections.map(s => s.type);

    expect(types).toContain('heading');
    expect(types).toContain('paragraph');
    expect(types).toContain('list');
    expect(types).toContain('quote');
  });

  it('joins multi-line paragraphs', () => {
    const sections = extractSummarySections('Line one\nLine two\nLine three');
    const paragraph = sections.find(s => s.type === 'paragraph');

    expect(paragraph?.content).toContain('Line one');
    expect(paragraph?.content).toContain('Line two');
    expect(paragraph?.content).toContain('Line three');
  });

  it('handles empty lines between content', () => {
    const sections = extractSummarySections('First\n\n\n\nSecond');
    const paragraphs = sections.filter(s => s.type === 'paragraph');

    expect(paragraphs.length).toBe(2);
  });
});
