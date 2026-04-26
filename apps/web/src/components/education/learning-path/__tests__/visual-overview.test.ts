/**
 * Tests for visual-overview.tsx
 * Plan 8 MVP - Wave 2 [F-11]
 *
 * @vitest-environment node
 * @module learning-path/__tests__/visual-overview.test
 */

import { describe, it, expect } from 'vitest';
import { generateMermaidCode } from '../visual-overview';
import type { LearningPathTopic } from '@/types';

describe('generateMermaidCode', () => {
  const createTopic = (
    id: string,
    title: string,
    order: number,
    status: 'locked' | 'unlocked' | 'in_progress' | 'completed' = 'locked',
    difficulty: 'basic' | 'intermediate' | 'advanced' = 'intermediate'
  ): LearningPathTopic => ({
    id,
    pathId: 'path-1',
    title,
    description: `Description for ${title}`,
    order,
    status,
    difficulty,
    keyConcepts: [],
    steps: [],
    estimatedMinutes: 10,
  });

  it('should generate empty diagram for no topics', () => {
    const code = generateMermaidCode([]);

    expect(code).toContain('flowchart TD');
    expect(code).toContain('Nessun argomento');
  });

  it('should generate nodes for each topic', () => {
    const topics = [
      createTopic('t1', 'Le Origini', 1),
      createTopic('t2', 'La Repubblica', 2),
      createTopic('t3', 'L\'Impero', 3),
    ];

    const code = generateMermaidCode(topics);

    expect(code).toContain('T0["');
    expect(code).toContain('T1["');
    expect(code).toContain('T2["');
    expect(code).toContain('Le Origini');
    expect(code).toContain('La Repubblica');
  });

  it('should connect topics in order', () => {
    const topics = [
      createTopic('t1', 'Topic A', 1, 'completed'),
      createTopic('t2', 'Topic B', 2, 'unlocked'),
    ];

    const code = generateMermaidCode(topics);

    expect(code).toContain('T0 --> T1');
  });

  it('should use dashed arrows for incomplete topics', () => {
    const topics = [
      createTopic('t1', 'Topic A', 1, 'unlocked'),
      createTopic('t2', 'Topic B', 2, 'locked'),
    ];

    const code = generateMermaidCode(topics);

    expect(code).toContain('T0 -.-> T1');
  });

  it('should apply status classes', () => {
    const topics = [
      createTopic('t1', 'Locked', 1, 'locked'),
      createTopic('t2', 'Unlocked', 2, 'unlocked'),
      createTopic('t3', 'In Progress', 3, 'in_progress'),
      createTopic('t4', 'Completed', 4, 'completed'),
    ];

    const code = generateMermaidCode(topics);

    expect(code).toContain('class T0 locked');
    expect(code).toContain('class T1 unlocked');
    expect(code).toContain('class T2 in_progress');
    expect(code).toContain('class T3 completed');
  });

  it('should include difficulty icons in non-compact mode', () => {
    const topics = [
      createTopic('t1', 'Basic Topic', 1, 'unlocked', 'basic'),
      createTopic('t2', 'Advanced Topic', 2, 'locked', 'advanced'),
    ];

    const code = generateMermaidCode(topics, false);

    expect(code).toContain('📗'); // basic icon
    expect(code).toContain('📕'); // advanced icon
  });

  it('should include lock icon for locked topics', () => {
    const topics = [createTopic('t1', 'Locked Topic', 1, 'locked')];

    const code = generateMermaidCode(topics);

    expect(code).toContain('🔒');
  });

  it('should include checkmark for completed topics', () => {
    const topics = [createTopic('t1', 'Done Topic', 1, 'completed')];

    const code = generateMermaidCode(topics);

    expect(code).toContain('✓');
  });

  it('should sort topics by order', () => {
    const topics = [
      createTopic('t3', 'Third', 3),
      createTopic('t1', 'First', 1),
      createTopic('t2', 'Second', 2),
    ];

    const code = generateMermaidCode(topics);

    // T0 should be First (order 1)
    expect(code).toMatch(/T0\[".*First/);
    // T1 should be Second (order 2)
    expect(code).toMatch(/T1\[".*Second/);
    // T2 should be Third (order 3)
    expect(code).toMatch(/T2\[".*Third/);
  });

  it('should define style classes', () => {
    const topics = [createTopic('t1', 'Topic', 1)];

    const code = generateMermaidCode(topics);

    expect(code).toContain('classDef locked');
    expect(code).toContain('classDef unlocked');
    expect(code).toContain('classDef in_progress');
    expect(code).toContain('classDef completed');
  });
});
