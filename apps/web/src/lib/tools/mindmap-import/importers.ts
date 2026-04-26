/**
 * Format-specific importers for mindmap
 */

import type { MindmapData, MindmapNode } from '../mindmap-export';
import type { ImportResult } from './types';
import { generateId, ensureNodeIds } from './helpers';

/**
 * Import from JSON format
 */
export function importFromJSON(content: string): ImportResult {
  try {
    const data = JSON.parse(content);

    if (!data.root && !data.title) {
      if (data.text) {
        return {
          success: true,
          mindmap: {
            title: data.text,
            root: data as MindmapNode,
          },
        };
      }
      return {
        success: false,
        error: 'JSON must contain root or title property',
      };
    }

    const mindmap: MindmapData = {
      title: data.title || data.root?.text || 'Imported Mindmap',
      topic: data.topic,
      root: data.root || { id: generateId(), text: data.title },
      createdAt: data.createdAt,
      updatedAt: new Date().toISOString(),
    };

    ensureNodeIds(mindmap.root);

    return { success: true, mindmap };
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : 'parse error'}`,
    };
  }
}

/**
 * Import from Markdown format
 */
export function importFromMarkdown(content: string): ImportResult {
  const lines = content.split('\n');
  const warnings: string[] = [];

  let title = 'Imported Mindmap';
  let startIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('# ')) {
      title = line.substring(2).trim();
      startIndex = i + 1;
      break;
    }
  }

  const root: MindmapNode = {
    id: generateId(),
    text: title,
    children: [],
  };

  const stack: { node: MindmapNode; depth: number }[] = [{ node: root, depth: -1 }];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('>')) continue;

    let depth = 0;
    let text = '';

    if (line.match(/^#{2,6}\s/)) {
      const match = line.match(/^(#{2,6})\s+(.+)/);
      if (match) {
        depth = match[1].length - 2;
        text = match[2].trim();
      }
    } else if (line.match(/^\s*[-*]\s/)) {
      const match = line.match(/^(\s*)([-*])\s+(.+)/);
      if (match) {
        depth = Math.floor(match[1].length / 2);
        text = match[3].trim();
      }
    } else {
      continue;
    }

    if (!text) continue;

    const newNode: MindmapNode = {
      id: generateId(),
      text,
      children: [],
    };

    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].node;
    if (!parent.children) parent.children = [];
    parent.children.push(newNode);

    stack.push({ node: newNode, depth });
  }

  if (!root.children || root.children.length === 0) {
    warnings.push('No child nodes found in markdown');
  }

  return {
    success: true,
    mindmap: {
      title,
      root,
      updatedAt: new Date().toISOString(),
    },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Import from FreeMind XML format
 */
export function importFromFreeMind(content: string): ImportResult {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return {
        success: false,
        error: 'Invalid FreeMind XML format',
      };
    }

    const mapElement = doc.querySelector('map');
    if (!mapElement) {
      return {
        success: false,
        error: 'No <map> element found',
      };
    }

    const rootElement = mapElement.querySelector('node');
    if (!rootElement) {
      return {
        success: false,
        error: 'No root <node> element found',
      };
    }

    function parseNode(element: Element): MindmapNode {
      const text = element.getAttribute('TEXT') || 'Untitled';
      const color = element.getAttribute('COLOR') || undefined;

      const children: MindmapNode[] = [];
      element.querySelectorAll(':scope > node').forEach((child) => {
        children.push(parseNode(child));
      });

      return {
        id: generateId(),
        text,
        color,
        children: children.length > 0 ? children : undefined,
      };
    }

    const root = parseNode(rootElement);

    return {
      success: true,
      mindmap: {
        title: root.text,
        root,
        updatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `FreeMind parse error: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
}

/**
 * Import from XMind JSON format
 */
export function importFromXMind(content: string | ArrayBuffer): ImportResult {
  if (typeof content !== 'string') {
    return {
      success: false,
      error: 'XMind archive format not yet supported. Use XMind JSON export.',
    };
  }

  try {
    const data = JSON.parse(content);
    const sheet = Array.isArray(data) ? data[0] : data;

    if (!sheet.rootTopic) {
      return {
        success: false,
        error: 'Invalid XMind JSON: missing rootTopic',
      };
    }

    function parseXMindTopic(topic: Record<string, unknown>): MindmapNode {
      const children: MindmapNode[] = [];
      const attached = (topic.children as Record<string, unknown>)?.attached;
      if (Array.isArray(attached)) {
        attached.forEach((child) => {
          children.push(parseXMindTopic(child as Record<string, unknown>));
        });
      }

      return {
        id: (topic.id as string) || generateId(),
        text: (topic.title as string) || 'Untitled',
        children: children.length > 0 ? children : undefined,
      };
    }

    const root = parseXMindTopic(sheet.rootTopic);

    return {
      success: true,
      mindmap: {
        title: sheet.title || root.text,
        root,
        updatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `XMind parse error: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
}

/**
 * Import from plain text (indentation-based)
 */
export function importFromText(content: string): ImportResult {
  const lines = content.split('\n').filter((l) => l.trim());

  if (lines.length === 0) {
    return { success: false, error: 'Empty content' };
  }

  const title = lines[0].trim();
  const root: MindmapNode = {
    id: generateId(),
    text: title,
    children: [],
  };

  const stack: { node: MindmapNode; indent: number }[] = [{ node: root, indent: -1 }];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    if (!trimmed) continue;

    const indent = line.length - trimmed.length;
    const text = trimmed.replace(/^[-*]\s*/, '').trim();

    if (!text) continue;

    const newNode: MindmapNode = {
      id: generateId(),
      text,
      children: [],
    };

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].node;
    if (!parent.children) parent.children = [];
    parent.children.push(newNode);

    stack.push({ node: newNode, indent });
  }

  return {
    success: true,
    mindmap: {
      title,
      root,
      updatedAt: new Date().toISOString(),
    },
  };
}
