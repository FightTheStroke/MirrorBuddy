/**
 * Format-specific exporters for mindmap
 */

import type { MindmapData, MindmapNode, ExportResult } from './types';
import { escapeXML, generateId } from './helpers';

/**
 * Export as JSON
 */
export function exportAsJSON(
  mindmap: MindmapData,
  filename: string,
  includeMetadata: boolean
): ExportResult {
  const data = includeMetadata
    ? mindmap
    : { title: mindmap.title, root: mindmap.root };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  return {
    blob,
    filename: `${filename}.json`,
    mimeType: 'application/json',
  };
}

/**
 * Export as Markdown
 */
export function exportAsMarkdown(mindmap: MindmapData, filename: string): ExportResult {
  const lines: string[] = [];

  lines.push(`# ${mindmap.title}`);
  lines.push('');

  if (mindmap.topic) {
    lines.push(`> ${mindmap.topic}`);
    lines.push('');
  }

  function nodeToMarkdown(node: MindmapNode, depth: number): void {
    const prefix = depth === 0 ? '## ' : '  '.repeat(depth - 1) + '- ';
    lines.push(`${prefix}${node.text}`);

    if (node.children) {
      for (const child of node.children) {
        nodeToMarkdown(child, depth + 1);
      }
    }
  }

  nodeToMarkdown(mindmap.root, 0);

  if (mindmap.createdAt) {
    lines.push('');
    lines.push(`---`);
    lines.push(`*Creata: ${new Date(mindmap.createdAt).toLocaleString('it-IT')}*`);
  }

  const markdown = lines.join('\n');
  const blob = new Blob([markdown], { type: 'text/markdown' });

  return {
    blob,
    filename: `${filename}.md`,
    mimeType: 'text/markdown',
  };
}

/**
 * Export as FreeMind XML format
 */
export function exportAsFreeMind(mindmap: MindmapData, filename: string): ExportResult {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<map version="1.0.1">');

  function nodeToXML(node: MindmapNode, position?: 'left' | 'right'): void {
    const posAttr = position ? ` POSITION="${position}"` : '';
    const colorAttr = node.color ? ` COLOR="${node.color}"` : '';

    if (node.children && node.children.length > 0) {
      lines.push(`<node TEXT="${escapeXML(node.text)}"${posAttr}${colorAttr}>`);
      node.children.forEach((child, index) => {
        const childPos = position ? undefined : index % 2 === 0 ? 'right' : 'left';
        nodeToXML(child, childPos);
      });
      lines.push('</node>');
    } else {
      lines.push(`<node TEXT="${escapeXML(node.text)}"${posAttr}${colorAttr}/>`);
    }
  }

  nodeToXML(mindmap.root);
  lines.push('</map>');

  const xml = lines.join('\n');
  const blob = new Blob([xml], { type: 'application/x-freemind' });

  return {
    blob,
    filename: `${filename}.mm`,
    mimeType: 'application/x-freemind',
  };
}

/**
 * Export as XMind format (JSON representation)
 */
export async function exportAsXMind(mindmap: MindmapData, filename: string): Promise<ExportResult> {
  function convertToXMindTopic(node: MindmapNode): unknown {
    return {
      id: node.id || generateId(),
      title: node.text,
      children: node.children
        ? { attached: node.children.map(convertToXMindTopic) }
        : undefined,
      style: node.color ? { properties: { 'svg:fill': node.color } } : undefined,
    };
  }

  const xmindData = {
    id: generateId(),
    title: mindmap.title,
    rootTopic: convertToXMindTopic(mindmap.root),
    extensions: [],
  };

  const json = JSON.stringify([xmindData], null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  return {
    blob,
    filename: `${filename}.xmind.json`,
    mimeType: 'application/json',
  };
}
