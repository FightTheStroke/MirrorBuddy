// ============================================================================
// MINDMAP IMPORT MODULE
// Multi-format import support for mindmaps
// Part of Phase 9: Import/Export Formats
// ============================================================================

import { logger } from '@/lib/logger';
import type { MindmapData, MindmapNode } from './mindmap-export';

// Supported import formats
export type ImportFormat = 'json' | 'markdown' | 'freemind' | 'xmind' | 'text';

export interface ImportOptions {
  format?: ImportFormat; // Auto-detect if not specified
}

export interface ImportResult {
  success: boolean;
  mindmap?: MindmapData;
  error?: string;
  warnings?: string[];
}

// ============================================================================
// MAIN IMPORT FUNCTION
// ============================================================================

/**
 * Import mindmap from file content
 */
export async function importMindmap(
  content: string | ArrayBuffer,
  filename: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const format = options.format || detectFormat(filename, content);

  logger.info('Importing mindmap', { format, filename });

  try {
    switch (format) {
      case 'json':
        return importFromJSON(content as string);
      case 'markdown':
        return importFromMarkdown(content as string);
      case 'freemind':
        return importFromFreeMind(content as string);
      case 'xmind':
        return importFromXMind(content);
      case 'text':
        return importFromText(content as string);
      default:
        return {
          success: false,
          error: `Unsupported format: ${format}`,
        };
    }
  } catch (error) {
    logger.error('Mindmap import failed', { error: String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Import failed',
    };
  }
}

/**
 * Import mindmap from File object (browser)
 */
export async function importMindmapFromFile(file: File): Promise<ImportResult> {
  const content = await file.text();
  return importMindmap(content, file.name);
}

// ============================================================================
// FORMAT DETECTION
// ============================================================================

/**
 * Detect format from filename and content
 */
function detectFormat(
  filename: string,
  content: string | ArrayBuffer
): ImportFormat {
  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'mm':
      return 'freemind';
    case 'xmind':
      return 'xmind';
    case 'txt':
      return 'text';
    default:
      // Try to detect from content
      if (typeof content === 'string') {
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
          return 'json';
        }
        if (content.includes('<?xml') && content.includes('<map')) {
          return 'freemind';
        }
        if (content.startsWith('#') || content.includes('\n- ')) {
          return 'markdown';
        }
      }
      return 'text';
  }
}

// ============================================================================
// FORMAT-SPECIFIC IMPORTERS
// ============================================================================

/**
 * Import from JSON format
 */
function importFromJSON(content: string): ImportResult {
  try {
    const data = JSON.parse(content);

    // Validate structure
    if (!data.root && !data.title) {
      // Try to interpret as raw node structure
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

    // Standard format
    const mindmap: MindmapData = {
      title: data.title || data.root?.text || 'Imported Mindmap',
      topic: data.topic,
      root: data.root || { id: generateId(), text: data.title },
      createdAt: data.createdAt,
      updatedAt: new Date().toISOString(),
    };

    // Ensure all nodes have IDs
    ensureNodeIds(mindmap.root);

    return {
      success: true,
      mindmap,
    };
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : 'parse error'}`,
    };
  }
}

/**
 * Import from Markdown format
 * Supports both heading-based (#) and list-based (-) hierarchy
 */
function importFromMarkdown(content: string): ImportResult {
  const lines = content.split('\n');
  const warnings: string[] = [];

  // Extract title from first # heading
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

  // Build tree from remaining content
  const root: MindmapNode = {
    id: generateId(),
    text: title,
    children: [],
  };

  const stack: { node: MindmapNode; depth: number }[] = [{ node: root, depth: -1 }];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('>')) continue;

    // Determine depth and text
    let depth = 0;
    let text = '';

    if (line.match(/^#{2,6}\s/)) {
      // Heading-based: ## = depth 0, ### = depth 1, etc.
      const match = line.match(/^(#{2,6})\s+(.+)/);
      if (match) {
        depth = match[1].length - 2;
        text = match[2].trim();
      }
    } else if (line.match(/^\s*[-*]\s/)) {
      // List-based: count leading spaces
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

    // Find parent
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
 * Import from FreeMind XML format (.mm)
 */
function importFromFreeMind(content: string): ImportResult {
  try {
    // Parse XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return {
        success: false,
        error: 'Invalid FreeMind XML format',
      };
    }

    // Find root node
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

    // Convert to MindmapNode
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
 * Import from XMind format
 * XMind is a ZIP archive containing JSON files
 */
function importFromXMind(content: string | ArrayBuffer): ImportResult {
  // For now, handle JSON-based XMind export
  // Full XMind import would require JSZip to unpack the archive

  if (typeof content !== 'string') {
    return {
      success: false,
      error: 'XMind archive format not yet supported. Use XMind JSON export.',
    };
  }

  try {
    const data = JSON.parse(content);

    // XMind JSON structure: array of sheets
    const sheet = Array.isArray(data) ? data[0] : data;

    if (!sheet.rootTopic) {
      return {
        success: false,
        error: 'Invalid XMind JSON: missing rootTopic',
      };
    }

    function parseXMindTopic(topic: Record<string, unknown>): MindmapNode {
      const children: MindmapNode[] = [];

      // XMind uses 'children.attached' for child topics
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
function importFromText(content: string): ImportResult {
  const lines = content.split('\n').filter((l) => l.trim());

  if (lines.length === 0) {
    return {
      success: false,
      error: 'Empty content',
    };
  }

  // First line is title/root
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

    // Count leading spaces/tabs
    const indent = line.length - trimmed.length;
    const text = trimmed.replace(/^[-*]\s*/, '').trim();

    if (!text) continue;

    const newNode: MindmapNode = {
      id: generateId(),
      text,
      children: [],
    };

    // Find parent based on indentation
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique ID
 */
function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Ensure all nodes have unique IDs
 */
function ensureNodeIds(node: MindmapNode): void {
  if (!node.id) {
    node.id = generateId();
  }
  if (node.children) {
    node.children.forEach(ensureNodeIds);
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate imported mindmap structure
 */
export function validateMindmap(mindmap: MindmapData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!mindmap.title) {
    errors.push('Missing title');
  }

  if (!mindmap.root) {
    errors.push('Missing root node');
  } else {
    if (!mindmap.root.text) {
      errors.push('Root node missing text');
    }
    validateNodeRecursive(mindmap.root, errors, 'root');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateNodeRecursive(
  node: MindmapNode,
  errors: string[],
  path: string
): void {
  if (!node.id) {
    errors.push(`Node at ${path} missing id`);
  }
  if (!node.text) {
    errors.push(`Node at ${path} missing text`);
  }
  if (node.children) {
    node.children.forEach((child, i) => {
      validateNodeRecursive(child, errors, `${path}.children[${i}]`);
    });
  }
}
