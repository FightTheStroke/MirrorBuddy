/**
 * SVG Overview Generator
 * Generates visual overviews of study content as SVG diagrams
 *
 * @module tools/svg-overview-generator
 */

import { logger } from '@/lib/logger';

/**
 * Node in the overview structure
 */
export interface OverviewNode {
  id: string;
  label: string;
  type: 'main' | 'section' | 'concept' | 'detail';
  children?: OverviewNode[];
  color?: string;
  icon?: string;
}

/**
 * Overview data structure
 */
export interface OverviewData {
  title: string;
  subject?: string;
  root: OverviewNode;
}

/**
 * SVG generation options
 */
export interface SVGGenerationOptions {
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  layout?: 'radial' | 'tree' | 'horizontal';
  nodeSpacing?: number;
  levelSpacing?: number;
  maxLabelLength?: number;
  showIcons?: boolean;
}

/**
 * Theme colors
 */
interface ThemeColors {
  background: string;
  mainNode: { fill: string; stroke: string; text: string };
  sectionNode: { fill: string; stroke: string; text: string };
  conceptNode: { fill: string; stroke: string; text: string };
  detailNode: { fill: string; stroke: string; text: string };
  line: string;
}

const THEMES: Record<'light' | 'dark', ThemeColors> = {
  light: {
    background: '#ffffff',
    mainNode: { fill: '#3b82f6', stroke: '#2563eb', text: '#ffffff' },
    sectionNode: { fill: '#8b5cf6', stroke: '#7c3aed', text: '#ffffff' },
    conceptNode: { fill: '#f0f9ff', stroke: '#0ea5e9', text: '#0c4a6e' },
    detailNode: { fill: '#fafafa', stroke: '#a3a3a3', text: '#404040' },
    line: '#94a3b8',
  },
  dark: {
    background: '#1e293b',
    mainNode: { fill: '#3b82f6', stroke: '#60a5fa', text: '#ffffff' },
    sectionNode: { fill: '#8b5cf6', stroke: '#a78bfa', text: '#ffffff' },
    conceptNode: { fill: '#1e3a5f', stroke: '#3b82f6', text: '#93c5fd' },
    detailNode: { fill: '#334155', stroke: '#64748b', text: '#cbd5e1' },
    line: '#475569',
  },
};

/**
 * Node type icons (emoji or unicode)
 */
const NODE_ICONS: Record<OverviewNode['type'], string> = {
  main: '🎯',
  section: '📑',
  concept: '💡',
  detail: '•',
};

/**
 * Calculate node positions using radial layout
 */
function calculateRadialPositions(
  node: OverviewNode,
  centerX: number,
  centerY: number,
  level: number,
  angleStart: number,
  angleEnd: number,
  levelSpacing: number
): Array<{ node: OverviewNode; x: number; y: number; level: number }> {
  const positions: Array<{ node: OverviewNode; x: number; y: number; level: number }> = [];

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
function calculateTreePositions(
  node: OverviewNode,
  x: number,
  y: number,
  level: number,
  nodeSpacing: number,
  levelSpacing: number,
  maxWidth: number
): Array<{ node: OverviewNode; x: number; y: number; level: number }> {
  const positions: Array<{ node: OverviewNode; x: number; y: number; level: number }> = [];

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

/**
 * Escape XML special characters
 */
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Truncate text to max length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
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
  let positions: Array<{ node: OverviewNode; x: number; y: number; level: number }>;

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
  lines.push(`  .section-node { fill: ${colors.sectionNode.fill}; stroke: ${colors.sectionNode.stroke}; stroke-width: 1.5; }`);
  lines.push(`  .concept-node { fill: ${colors.conceptNode.fill}; stroke: ${colors.conceptNode.stroke}; stroke-width: 1; }`);
  lines.push(`  .detail-node { fill: ${colors.detailNode.fill}; stroke: ${colors.detailNode.stroke}; stroke-width: 1; }`);
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
    const nodeColors = colors[`${pos.node.type}Node` as keyof typeof colors] as { fill: string; stroke: string; text: string };
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

/**
 * Draw connection lines between nodes
 */
function drawConnections(
  node: OverviewNode,
  positions: Array<{ node: OverviewNode; x: number; y: number; level: number }>,
  lines: string[]
): void {
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
 * Count total nodes in tree
 */
function countNodes(node: OverviewNode): number {
  if (!node.children) return 1;
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

/**
 * Generate Mermaid flowchart code from overview data
 * Used as fallback when SVG generation is not suitable
 */
export function generateMermaidCode(data: OverviewData): string {
  const lines: string[] = ['flowchart TD'];

  // Define styles
  lines.push('    classDef main fill:#3b82f6,stroke:#2563eb,color:#fff');
  lines.push('    classDef section fill:#8b5cf6,stroke:#7c3aed,color:#fff');
  lines.push('    classDef concept fill:#f0f9ff,stroke:#0ea5e9,color:#0c4a6e');
  lines.push('    classDef detail fill:#fafafa,stroke:#a3a3a3,color:#404040');

  // Build nodes and connections
  function processNode(node: OverviewNode, parentId?: string): void {
    const safeId = node.id.replace(/[^a-zA-Z0-9]/g, '_');
    const safeLabel = node.label.replace(/"/g, "'").substring(0, 30);

    lines.push(`    ${safeId}["${safeLabel}"]`);

    if (parentId) {
      lines.push(`    ${parentId} --> ${safeId}`);
    }

    lines.push(`    class ${safeId} ${node.type}`);

    if (node.children) {
      node.children.forEach((child) => processNode(child, safeId));
    }
  }

  processNode(data.root);

  return lines.join('\n');
}

/**
 * Parse summary text into overview structure
 * Extracts main topics and concepts from text
 */
export function parseTextToOverview(title: string, text: string, subject?: string): OverviewData {
  const lines = text.split('\n').filter((line) => line.trim());
  const root: OverviewNode = {
    id: 'root',
    label: title,
    type: 'main',
    children: [],
  };

  let currentSection: OverviewNode | null = null;
  let idCounter = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect headers (## or ###)
    if (trimmed.startsWith('## ')) {
      currentSection = {
        id: `section_${++idCounter}`,
        label: trimmed.replace('## ', ''),
        type: 'section',
        children: [],
      };
      root.children?.push(currentSection);
    } else if (trimmed.startsWith('### ')) {
      const concept: OverviewNode = {
        id: `concept_${++idCounter}`,
        label: trimmed.replace('### ', ''),
        type: 'concept',
        children: [],
      };
      if (currentSection) {
        currentSection.children?.push(concept);
      } else {
        root.children?.push(concept);
      }
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const detail: OverviewNode = {
        id: `detail_${++idCounter}`,
        label: trimmed.replace(/^[-*]\s+/, ''),
        type: 'detail',
      };
      if (currentSection?.children && currentSection.children.length > 0) {
        const lastChild = currentSection.children[currentSection.children.length - 1];
        if (!lastChild.children) lastChild.children = [];
        lastChild.children.push(detail);
      } else if (currentSection) {
        currentSection.children?.push(detail);
      }
    }
  }

  // If no structure found, create simple structure from paragraphs
  if (!root.children?.length) {
    const paragraphs = text.split('\n\n').filter((p) => p.trim());
    paragraphs.slice(0, 5).forEach((p, i) => {
      root.children?.push({
        id: `para_${i}`,
        label: p.substring(0, 50) + (p.length > 50 ? '...' : ''),
        type: 'concept',
      });
    });
  }

  return { title, subject, root };
}
