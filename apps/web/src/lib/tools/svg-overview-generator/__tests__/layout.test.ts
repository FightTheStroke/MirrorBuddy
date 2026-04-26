/**
 * Layout Calculation Tests
 */

import { describe, it, expect } from 'vitest';
import { calculateRadialPositions, calculateTreePositions } from '../layout';
import type { OverviewNode } from '../types';

describe('layout calculations', () => {
  const createNode = (
    id: string,
    label: string,
    children: OverviewNode[] = []
  ): OverviewNode => ({
    id,
    label,
    type: 'main',
    children,
  });

  describe('calculateRadialPositions', () => {
    it('should position root node at center', () => {
      const node = createNode('root', 'Root');
      const positions = calculateRadialPositions(node, 500, 400, 0, 0, Math.PI * 2, 150);

      expect(positions.length).toBe(1);
      expect(positions[0].x).toBe(500);
      expect(positions[0].y).toBe(400);
      expect(positions[0].level).toBe(0);
    });

    it('should position children in a radial pattern', () => {
      const node = createNode('root', 'Root', [
        createNode('child1', 'Child 1'),
        createNode('child2', 'Child 2'),
      ]);
      const positions = calculateRadialPositions(node, 500, 400, 0, 0, Math.PI * 2, 150);

      expect(positions.length).toBe(3);
      // Children should be at level 1
      expect(positions[1].level).toBe(1);
      expect(positions[2].level).toBe(1);
    });

    it('should calculate children positions away from center', () => {
      const node = createNode('root', 'Root', [createNode('child1', 'Child 1')]);
      const positions = calculateRadialPositions(node, 500, 400, 0, 0, Math.PI * 2, 150);

      const childPos = positions[1];
      // Child should be at a distance from center
      const distance = Math.sqrt(
        Math.pow(childPos.x - 500, 2) + Math.pow(childPos.y - 400, 2)
      );
      expect(distance).toBeGreaterThan(100);
    });

    it('should handle nested children', () => {
      const node = createNode('root', 'Root', [
        createNode('child1', 'Child 1', [createNode('grandchild', 'Grandchild')]),
      ]);
      const positions = calculateRadialPositions(node, 500, 400, 0, 0, Math.PI * 2, 150);

      expect(positions.length).toBe(3);
      expect(positions[2].level).toBe(2);
    });

    it('should return only root for node without children', () => {
      const node = createNode('root', 'Root');
      const positions = calculateRadialPositions(node, 500, 400, 0, 0, Math.PI * 2, 150);

      expect(positions.length).toBe(1);
      expect(positions[0].node.id).toBe('root');
    });
  });

  describe('calculateTreePositions', () => {
    it('should position root node at specified coordinates', () => {
      const node = createNode('root', 'Root');
      const positions = calculateTreePositions(node, 500, 50, 0, 50, 100, 1000);

      expect(positions.length).toBe(1);
      expect(positions[0].y).toBe(50);
      expect(positions[0].level).toBe(0);
    });

    it('should position children below parent', () => {
      const node = createNode('root', 'Root', [
        createNode('child1', 'Child 1'),
        createNode('child2', 'Child 2'),
      ]);
      const positions = calculateTreePositions(node, 500, 50, 0, 50, 100, 1000);

      expect(positions.length).toBe(3);
      // Children should be at a lower y position
      expect(positions[1].y).toBe(150); // 50 + 100 (levelSpacing)
      expect(positions[2].y).toBe(150);
    });

    it('should distribute children horizontally', () => {
      const node = createNode('root', 'Root', [
        createNode('child1', 'Child 1'),
        createNode('child2', 'Child 2'),
      ]);
      const positions = calculateTreePositions(node, 500, 50, 0, 50, 100, 1000);

      const child1X = positions[1].x;
      const child2X = positions[2].x;
      // Children should have different x positions
      expect(child1X).not.toBe(child2X);
    });

    it('should handle nested children with correct levels', () => {
      const node = createNode('root', 'Root', [
        createNode('child', 'Child', [createNode('grandchild', 'Grandchild')]),
      ]);
      const positions = calculateTreePositions(node, 500, 50, 0, 50, 100, 1000);

      expect(positions.length).toBe(3);
      expect(positions[2].level).toBe(2);
      expect(positions[2].y).toBe(250); // 50 + 100 + 100
    });

    it('should position single child centered under parent', () => {
      const node = createNode('root', 'Root', [createNode('child', 'Child')]);
      const positions = calculateTreePositions(node, 500, 50, 0, 50, 100, 1000);

      // With one child, they should share the same x as root
      const rootX = positions[0].x;
      const childX = positions[1].x;
      expect(rootX).toBe(childX);
    });

    it('should respect maxWidth for layout', () => {
      const node = createNode('root', 'Root', [
        createNode('c1', '1'),
        createNode('c2', '2'),
        createNode('c3', '3'),
        createNode('c4', '4'),
      ]);
      const maxWidth = 800;
      const positions = calculateTreePositions(node, 500, 50, 0, 50, 100, maxWidth);

      // All children should be within maxWidth bounds
      const childrenX = positions.filter((p) => p.level === 1).map((p) => p.x);
      const minX = Math.min(...childrenX);
      const maxX = Math.max(...childrenX);
      const spread = maxX - minX;
      expect(spread).toBeLessThanOrEqual(maxWidth);
    });
  });
});
