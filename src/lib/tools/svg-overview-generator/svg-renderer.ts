/**
 * SVG rendering functions for SVG Overview Generator
 */

import { logger } from '@/lib/logger';
import type { OverviewData, SVGGenerationOptions, NodePosition, OverviewNode } from './types';
import { THEMES, NODE_ICONS } from './constants';
import { calculateRadialPositions, calculateTreePositions } from './layout';
import { escapeXML, truncateText, countNodes } from './text-utilities';

/**
 * Draw connection lines between nodes
 */
function drawConnections(node: OverviewNode, positions: NodePosition[], lines: string[]): void {
  if (!node.children) return;

  const parentPos = positions.find((p) => p.node.id === node.id);
  if (!parentPos) return;

  for (const child of node.children) {
    const childPos = positions.find((p) => p.node.id === child.id);
    if (childPos) {
      // Draw curved line
      const midY = (parentPos.y + childPos.y) / 2;
      lines.push(
        `<path class="connection" d="M${parentPos.x},${parentPos.y} Q${parentPos.x},${midY} ${childPos.x},${childPos.y}"/>`
      );
    }
    drawConnections(child, positions, lines);
  }
}

/**
 * Generate SVG visual overview
 */
export function generateOverviewSVG(data: OverviewData, options: SVGGenerationOptions = {}): string {
  const {
    width = 1200,
    height = 800,
    theme = 'dark',
    layout = 'radial',
    nodeSpacing = 80,
    levelSpacing = 150,
    maxLabelLength = 25,
    showIcons = true,
  } = options;

  const colors = THEMES[theme];
  const centerX = width / 2;
  const centerY = height / 2;

  logger.debug('[SVGGenerator] Generating overview', {
    title: data.title,
    layout,
    theme,
    nodeCount: countNodes(data.root),
  });

  // Calculate positions based on layout
  let positions: NodePosition[];

  if (layout === 'radial') {
    positions = calculateRadialPositions(data.root, centerX, centerY, 0, 0, 2 * Math.PI, levelSpacing);
  } else {
    positions = calculateTreePositions(
      data.root,
      centerX,
      80,
      0,
      nodeSpacing,
      levelSpacing,
      width - 100
    );
  }

  const lines: string[] = [];

  // SVG header
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`
  );

  // Styles
  lines.push('<style>');
  lines.push(`  .background { fill: ${colors.background}; }`);
  lines.push('  text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }');
  lines.push(`  .main-node { fill: ${colors.mainNode.fill}; stroke: ${colors.mainNode.stroke}; stroke-width: 2; }`);
  lines.push(
    `  .section-node { fill: ${colors.sectionNode.fill}; stroke: ${colors.sectionNode.stroke}; stroke-width: 1.5; }`
  );
  lines.push(
    `  .concept-node { fill: ${colors.conceptNode.fill}; stroke: ${colors.conceptNode.stroke}; stroke-width: 1; }`
  );
  lines.push(
    `  .detail-node { fill: ${colors.detailNode.fill}; stroke: ${colors.detailNode.stroke}; stroke-width: 1; }`
  );
  lines.push(`  .connection { stroke: ${colors.line}; stroke-width: 1.5; fill: none; }`);
  lines.push('  .node-rect { rx: 8; ry: 8; }');
  lines.push('</style>');

  // Background
  lines.push(`<rect class="background" width="${width}" height="${height}"/>`);

  // Title
  lines.push(
    `<text x="${width / 2}" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="${
      theme === 'dark' ? '#f1f5f9' : '#1e293b'
    }">${escapeXML(data.title)}</text>`
  );

  // Draw connections first (so nodes appear on top)
  drawConnections(data.root, positions, lines);

  // Draw nodes
  for (const pos of positions) {
    const nodeColors = colors[`${pos.node.type}Node` as keyof typeof colors] as {
      fill: string;
      stroke: string;
      text: string;
    };
    const fontSize = pos.level === 0 ? 16 : pos.level === 1 ? 14 : 12;
    const padding = pos.level === 0 ? 20 : 12;
    const label = truncateText(pos.node.label, maxLabelLength);
    const icon = showIcons ? NODE_ICONS[pos.node.type] + ' ' : '';
    const displayText = icon + label;

    const textWidth = displayText.length * (fontSize * 0.55);
    const rectWidth = Math.max(textWidth + padding * 2, 60);
    const rectHeight = fontSize + padding * 1.5;

    // Node rectangle
    lines.push(
      `<rect class="node-rect ${pos.node.type}-node" x="${pos.x - rectWidth / 2}" y="${
        pos.y - rectHeight / 2
      }" width="${rectWidth}" height="${rectHeight}"/>`
    );

    // Node text
    lines.push(
      `<text x="${pos.x}" y="${pos.y + fontSize / 3}" text-anchor="middle" font-size="${fontSize}" fill="${
        nodeColors.text
      }">${escapeXML(displayText)}</text>`
    );
  }

  // Subject badge if present
  if (data.subject) {
    lines.push(
      `<text x="${width - 20}" y="${height - 20}" text-anchor="end" font-size="12" fill="${
        theme === 'dark' ? '#64748b' : '#94a3b8'
      }">${escapeXML(data.subject)}</text>`
    );
  }

  lines.push('</svg>');

  return lines.join('\n');
}
