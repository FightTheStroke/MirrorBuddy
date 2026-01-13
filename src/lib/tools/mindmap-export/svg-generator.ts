/**
 * SVG generator for mindmap export
 */

import type { MindmapData, MindmapNode, ExportResult } from './types';
import { escapeXML } from './helpers';

/**
 * Export as SVG
 */
export function exportAsSVG(mindmap: MindmapData, filename: string): ExportResult {
  if (typeof window === 'undefined') {
    throw new Error('SVG export requires browser environment');
  }

  const svgElement = document.querySelector('.markmap svg') as SVGElement | null;

  if (svgElement) {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });

    return {
      blob,
      filename: `${filename}.svg`,
      mimeType: 'image/svg+xml',
    };
  }

  const svg = generateSimpleSVG(mindmap);
  const blob = new Blob([svg], { type: 'image/svg+xml' });

  return {
    blob,
    filename: `${filename}.svg`,
    mimeType: 'image/svg+xml',
  };
}

/**
 * Export as PNG
 */
export async function exportAsPNG(mindmap: MindmapData, filename: string): Promise<ExportResult> {
  if (typeof window === 'undefined') {
    throw new Error('PNG export requires browser environment');
  }

  const svgResult = exportAsSVG(mindmap, filename);
  const svgText = await svgResult.blob.text();

  const img = new Image();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  return new Promise((resolve, reject) => {
    img.onload = () => {
      canvas.width = img.width || 1200;
      canvas.height = img.height || 800;

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({
              blob,
              filename: `${filename}.png`,
              mimeType: 'image/png',
            });
          } else {
            reject(new Error('Failed to create PNG blob'));
          }
        },
        'image/png',
        1.0
      );
    };

    img.onerror = () => reject(new Error('Failed to load SVG for PNG conversion'));

    const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
    img.src = URL.createObjectURL(svgBlob);
  });
}

/**
 * Generate simple SVG representation
 */
function generateSimpleSVG(mindmap: MindmapData): string {
  const width = 1200;
  const height = 800;
  const centerX = width / 2;
  const centerY = height / 2;
  const levelSpacing = 150;
  const nodeHeight = 30;

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`);
  lines.push('<style>');
  lines.push('  text { font-family: Arial, sans-serif; font-size: 14px; fill: #333; }');
  lines.push('  .root { font-size: 18px; font-weight: bold; }');
  lines.push('  .level1 { font-size: 14px; font-weight: 600; }');
  lines.push('  .level2 { font-size: 12px; }');
  lines.push('  line { stroke: #666; stroke-width: 1.5; }');
  lines.push('  rect.node { fill: #f0f0f0; stroke: #999; rx: 5; }');
  lines.push('  rect.root-node { fill: #4a90d9; stroke: #2a70b9; rx: 8; }');
  lines.push('</style>');
  lines.push('<rect width="100%" height="100%" fill="white"/>');

  interface NodePosition {
    x: number;
    y: number;
    node: MindmapNode;
    level: number;
  }
  const positions: NodePosition[] = [];

  function calculatePositions(
    node: MindmapNode,
    x: number,
    y: number,
    level: number,
    angleStart: number,
    angleEnd: number
  ): void {
    positions.push({ x, y, node, level });

    if (!node.children || node.children.length === 0) return;

    const angleRange = angleEnd - angleStart;
    const angleStep = angleRange / node.children.length;

    node.children.forEach((child, index) => {
      const angle = angleStart + angleStep * (index + 0.5);
      const distance = levelSpacing * (level === 0 ? 1.2 : 0.8);
      const childX = x + Math.cos(angle) * distance;
      const childY = y + Math.sin(angle) * distance;

      lines.push(`<line x1="${x}" y1="${y}" x2="${childX}" y2="${childY}"/>`);

      calculatePositions(child, childX, childY, level + 1, angle - angleStep / 2, angle + angleStep / 2);
    });
  }

  calculatePositions(mindmap.root, centerX, centerY, 0, 0, 2 * Math.PI);

  for (const pos of positions) {
    const textWidth = Math.min(pos.node.text.length * 8, 200);
    const rectWidth = textWidth + 16;
    const rectHeight = nodeHeight;
    const rectX = pos.x - rectWidth / 2;
    const rectY = pos.y - rectHeight / 2;

    const nodeClass = pos.level === 0 ? 'root-node' : 'node';
    const textClass = pos.level === 0 ? 'root' : pos.level === 1 ? 'level1' : 'level2';
    const textFill = pos.level === 0 ? 'white' : '#333';

    lines.push(`<rect class="${nodeClass}" x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}"/>`);
    lines.push(`<text x="${pos.x}" y="${pos.y + 5}" text-anchor="middle" class="${textClass}" fill="${textFill}">${escapeXML(pos.node.text.substring(0, 25))}</text>`);
  }

  lines.push('</svg>');
  return lines.join('\n');
}
