/**
 * Layout calculation functions for SVG Overview Generator
 */

import type { OverviewNode, NodePosition } from './types';

/**
 * Calculate node positions using radial layout
 */
export function calculateRadialPositions(
  node: OverviewNode,
  centerX: number,
  centerY: number,
  level: number,
  angleStart: number,
  angleEnd: number,
  levelSpacing: number
): NodePosition[] {
  const positions: NodePosition[] = [];

  positions.push({ node, x: centerX, y: centerY, level });

  if (!node.children || node.children.length === 0) return positions;

  const angleRange = angleEnd - angleStart;
  const angleStep = angleRange / node.children.length;

  node.children.forEach((child, index) => {
    const angle = angleStart + angleStep * (index + 0.5);
    const distance = levelSpacing * (level === 0 ? 1.3 : 0.9);
    const childX = centerX + Math.cos(angle) * distance;
    const childY = centerY + Math.sin(angle) * distance;

    const childPositions = calculateRadialPositions(
      child,
      childX,
      childY,
      level + 1,
      angle - angleStep / 2,
      angle + angleStep / 2,
      levelSpacing * 0.85
    );

    positions.push(...childPositions);
  });

  return positions;
}

/**
 * Calculate node positions using tree layout
 */
export function calculateTreePositions(
  node: OverviewNode,
  x: number,
  y: number,
  level: number,
  nodeSpacing: number,
  levelSpacing: number,
  maxWidth: number
): NodePosition[] {
  const positions: NodePosition[] = [];

  // Count total leaves in subtree for width calculation
  function countLeaves(n: OverviewNode): number {
    if (!n.children || n.children.length === 0) return 1;
    return n.children.reduce((sum, child) => sum + countLeaves(child), 0);
  }

  function positionNode(
    n: OverviewNode,
    startX: number,
    currentY: number,
    lvl: number,
    availableWidth: number
  ): void {
    const leaves = countLeaves(n);
    const nodeX = startX + availableWidth / 2;

    positions.push({ node: n, x: nodeX, y: currentY, level: lvl });

    if (n.children && n.children.length > 0) {
      let childStartX = startX;
      n.children.forEach((child) => {
        const childLeaves = countLeaves(child);
        const childWidth = (childLeaves / leaves) * availableWidth;
        positionNode(child, childStartX, currentY + levelSpacing, lvl + 1, childWidth);
        childStartX += childWidth;
      });
    }
  }

  positionNode(node, x - maxWidth / 2, y, level, maxWidth);
  return positions;
}
