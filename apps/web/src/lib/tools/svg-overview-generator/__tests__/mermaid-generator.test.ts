/**
 * Mermaid Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { generateMermaidCode } from '../mermaid-generator';
import type { OverviewData } from '../types';

describe('generateMermaidCode', () => {
  const createBasicData = (): OverviewData => ({
    root: {
      id: 'main',
      label: 'Main Topic',
      type: 'main',
      children: [],
    },
    title: 'Test Overview',
    subject: 'math',
  });

  it('should generate flowchart TD header', () => {
    const data = createBasicData();
    const result = generateMermaidCode(data);
    expect(result).toContain('flowchart TD');
  });

  it('should include class definitions', () => {
    const data = createBasicData();
    const result = generateMermaidCode(data);

    expect(result).toContain('classDef main fill:#3b82f6');
    expect(result).toContain('classDef section fill:#8b5cf6');
    expect(result).toContain('classDef concept fill:#f0f9ff');
    expect(result).toContain('classDef detail fill:#fafafa');
  });

  it('should render root node', () => {
    const data = createBasicData();
    const result = generateMermaidCode(data);

    expect(result).toContain('main["Main Topic"]');
    expect(result).toContain('class main main');
  });

  it('should render children with connections', () => {
    const data: OverviewData = {
      ...createBasicData(),
      root: {
        id: 'main',
        label: 'Main Topic',
        type: 'main',
        children: [
          { id: 'section1', label: 'Section 1', type: 'section', children: [] },
          { id: 'section2', label: 'Section 2', type: 'section', children: [] },
        ],
      },
    };
    const result = generateMermaidCode(data);

    expect(result).toContain('main --> section1');
    expect(result).toContain('main --> section2');
    expect(result).toContain('section1["Section 1"]');
    expect(result).toContain('section2["Section 2"]');
  });

  it('should render nested children', () => {
    const data: OverviewData = {
      ...createBasicData(),
      root: {
        id: 'main',
        label: 'Main',
        type: 'main',
        children: [
          {
            id: 'section',
            label: 'Section',
            type: 'section',
            children: [
              { id: 'concept', label: 'Concept', type: 'concept', children: [] },
            ],
          },
        ],
      },
    };
    const result = generateMermaidCode(data);

    expect(result).toContain('main --> section');
    expect(result).toContain('section --> concept');
  });

  it('should sanitize node IDs with special characters', () => {
    const data: OverviewData = {
      ...createBasicData(),
      root: {
        id: 'main-id.with/special',
        label: 'Main',
        type: 'main',
        children: [],
      },
    };
    const result = generateMermaidCode(data);

    expect(result).toContain('main_id_with_special["Main"]');
  });

  it('should escape double quotes in labels', () => {
    const data: OverviewData = {
      ...createBasicData(),
      root: {
        id: 'main',
        label: 'Say "Hello"',
        type: 'main',
        children: [],
      },
    };
    const result = generateMermaidCode(data);

    expect(result).toContain("Say 'Hello'");
  });

  it('should truncate long labels to 30 characters', () => {
    const longLabel = 'This is a very long label that exceeds thirty characters';
    const data: OverviewData = {
      ...createBasicData(),
      root: {
        id: 'main',
        label: longLabel,
        type: 'main',
        children: [],
      },
    };
    const result = generateMermaidCode(data);

    expect(result).not.toContain(longLabel);
    expect(result).toContain(longLabel.substring(0, 30));
  });

  it('should assign correct class based on node type', () => {
    const data: OverviewData = {
      ...createBasicData(),
      root: {
        id: 'main',
        label: 'Main',
        type: 'main',
        children: [
          { id: 'sect', label: 'Section', type: 'section', children: [] },
          { id: 'conc', label: 'Concept', type: 'concept', children: [] },
          { id: 'det', label: 'Detail', type: 'detail', children: [] },
        ],
      },
    };
    const result = generateMermaidCode(data);

    expect(result).toContain('class main main');
    expect(result).toContain('class sect section');
    expect(result).toContain('class conc concept');
    expect(result).toContain('class det detail');
  });
});
