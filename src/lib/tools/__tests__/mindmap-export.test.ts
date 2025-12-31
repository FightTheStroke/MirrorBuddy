/**
 * Tests for mindmap export module
 * @module tools/mindmap-export
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportMindmap,
  type MindmapData,
  type MindmapNode,
  type ExportFormat,
} from '../mindmap-export';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Mindmap Export', () => {
  // Sample mindmap data for testing
  const sampleMindmap: MindmapData = {
    title: 'Test Mindmap',
    topic: 'Testing',
    root: {
      id: 'root-1',
      text: 'Root Node',
      children: [
        {
          id: 'child-1',
          text: 'Child 1',
          color: '#ff0000',
          children: [
            { id: 'grandchild-1', text: 'Grandchild 1' },
            { id: 'grandchild-2', text: 'Grandchild 2' },
          ],
        },
        {
          id: 'child-2',
          text: 'Child 2',
        },
      ],
    },
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T12:00:00Z',
  };

  describe('exportMindmap', () => {
    describe('JSON export', () => {
      it('should export mindmap as JSON with metadata', async () => {
        const result = await exportMindmap(sampleMindmap, {
          format: 'json',
          includeMetadata: true,
        });

        expect(result.filename).toBe('Test_Mindmap.json');
        expect(result.mimeType).toBe('application/json');

        const content = await result.blob.text();
        const parsed = JSON.parse(content);

        expect(parsed.title).toBe('Test Mindmap');
        expect(parsed.topic).toBe('Testing');
        expect(parsed.root.text).toBe('Root Node');
        expect(parsed.createdAt).toBe('2025-01-15T10:00:00Z');
      });

      it('should export mindmap as JSON without metadata', async () => {
        const result = await exportMindmap(sampleMindmap, {
          format: 'json',
          includeMetadata: false,
        });

        const content = await result.blob.text();
        const parsed = JSON.parse(content);

        expect(parsed.title).toBe('Test Mindmap');
        expect(parsed.root.text).toBe('Root Node');
        expect(parsed.createdAt).toBeUndefined();
        expect(parsed.updatedAt).toBeUndefined();
      });

      it('should use custom filename', async () => {
        const result = await exportMindmap(sampleMindmap, {
          format: 'json',
          filename: 'custom_name',
        });

        expect(result.filename).toBe('custom_name.json');
      });
    });

    describe('Markdown export', () => {
      it('should export mindmap as Markdown', async () => {
        const result = await exportMindmap(sampleMindmap, {
          format: 'markdown',
        });

        expect(result.filename).toBe('Test_Mindmap.md');
        expect(result.mimeType).toBe('text/markdown');

        const content = await result.blob.text();

        expect(content).toContain('# Test Mindmap');
        expect(content).toContain('> Testing');
        expect(content).toContain('## Root Node');
        expect(content).toContain('- Child 1');
        expect(content).toContain('- Child 2');
        expect(content).toContain('- Grandchild 1');
      });

      it('should include creation date if available', async () => {
        const result = await exportMindmap(sampleMindmap, {
          format: 'markdown',
        });

        const content = await result.blob.text();
        expect(content).toContain('Creata:');
      });

      it('should handle mindmap without topic', async () => {
        const noTopicMindmap: MindmapData = {
          title: 'No Topic',
          root: { id: '1', text: 'Root' },
        };

        const result = await exportMindmap(noTopicMindmap, {
          format: 'markdown',
        });

        const content = await result.blob.text();
        expect(content).not.toContain('>');
        expect(content).toContain('# No Topic');
      });
    });

    describe('FreeMind export', () => {
      it('should export mindmap as FreeMind XML', async () => {
        const result = await exportMindmap(sampleMindmap, {
          format: 'freemind',
        });

        expect(result.filename).toBe('Test_Mindmap.mm');
        expect(result.mimeType).toBe('application/x-freemind');

        const content = await result.blob.text();

        expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(content).toContain('<map version="1.0.1">');
        expect(content).toContain('TEXT="Root Node"');
        expect(content).toContain('TEXT="Child 1"');
        expect(content).toContain('COLOR="#ff0000"');
        expect(content).toContain('</map>');
      });

      it('should escape XML special characters', async () => {
        const specialMindmap: MindmapData = {
          title: 'Special <chars> & "quotes"',
          root: {
            id: '1',
            text: '<script>alert("XSS")</script>',
          },
        };

        const result = await exportMindmap(specialMindmap, {
          format: 'freemind',
        });

        const content = await result.blob.text();

        expect(content).not.toContain('<script>');
        expect(content).toContain('&lt;script&gt;');
        expect(content).toContain('&quot;');
      });
    });

    describe('XMind export', () => {
      it('should export mindmap as XMind JSON', async () => {
        const result = await exportMindmap(sampleMindmap, {
          format: 'xmind',
        });

        expect(result.filename).toBe('Test_Mindmap.xmind.json');
        expect(result.mimeType).toBe('application/json');

        const content = await result.blob.text();
        const parsed = JSON.parse(content);

        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed[0].title).toBe('Test Mindmap');
        expect(parsed[0].rootTopic).toBeDefined();
        expect(parsed[0].rootTopic.title).toBe('Root Node');
      });

      it('should include children in XMind format', async () => {
        const result = await exportMindmap(sampleMindmap, {
          format: 'xmind',
        });

        const content = await result.blob.text();
        const parsed = JSON.parse(content);

        const rootTopic = parsed[0].rootTopic;
        expect(rootTopic.children).toBeDefined();
        expect(rootTopic.children.attached).toBeDefined();
        expect(rootTopic.children.attached.length).toBe(2);
      });
    });

    describe('Unsupported format', () => {
      it('should throw error for unsupported format', async () => {
        await expect(
          exportMindmap(sampleMindmap, {
            format: 'invalid' as ExportFormat,
          })
        ).rejects.toThrow('Unsupported export format: invalid');
      });
    });

    describe('Filename sanitization', () => {
      it('should sanitize special characters in filename', async () => {
        const specialMindmap: MindmapData = {
          title: 'File/Name:With*Special?Chars',
          root: { id: '1', text: 'Root' },
        };

        const result = await exportMindmap(specialMindmap, {
          format: 'json',
        });

        expect(result.filename).toBe('FileNameWithSpecialChars.json');
        expect(result.filename).not.toContain('/');
        expect(result.filename).not.toContain(':');
        expect(result.filename).not.toContain('*');
        expect(result.filename).not.toContain('?');
      });

      it('should replace spaces with underscores', async () => {
        const spacedMindmap: MindmapData = {
          title: 'File Name With Spaces',
          root: { id: '1', text: 'Root' },
        };

        const result = await exportMindmap(spacedMindmap, {
          format: 'json',
        });

        expect(result.filename).toBe('File_Name_With_Spaces.json');
      });

      it('should truncate long filenames', async () => {
        const longMindmap: MindmapData = {
          title: 'A'.repeat(200),
          root: { id: '1', text: 'Root' },
        };

        const result = await exportMindmap(longMindmap, {
          format: 'json',
        });

        // Filename should be <= 100 chars + extension
        expect(result.filename.length).toBeLessThanOrEqual(105);
      });

      it('should use default filename for empty title', async () => {
        const noTitleMindmap: MindmapData = {
          title: '',
          root: { id: '1', text: 'Root' },
        };

        const result = await exportMindmap(noTitleMindmap, {
          format: 'json',
        });

        expect(result.filename).toBe('mindmap.json');
      });
    });

    describe('Nested structures', () => {
      it('should handle deeply nested children', async () => {
        const deepMindmap: MindmapData = {
          title: 'Deep',
          root: {
            id: '1',
            text: 'Level 0',
            children: [
              {
                id: '2',
                text: 'Level 1',
                children: [
                  {
                    id: '3',
                    text: 'Level 2',
                    children: [
                      {
                        id: '4',
                        text: 'Level 3',
                        children: [{ id: '5', text: 'Level 4' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        };

        const jsonResult = await exportMindmap(deepMindmap, { format: 'json' });
        const jsonContent = JSON.parse(await jsonResult.blob.text());
        expect(jsonContent.root.children[0].children[0].children[0].children[0].text).toBe('Level 4');

        const mdResult = await exportMindmap(deepMindmap, { format: 'markdown' });
        const mdContent = await mdResult.blob.text();
        expect(mdContent).toContain('Level 4');
      });

      it('should handle nodes without children', async () => {
        const leafMindmap: MindmapData = {
          title: 'Leaf',
          root: { id: '1', text: 'Only Root' },
        };

        const result = await exportMindmap(leafMindmap, { format: 'json' });
        const content = JSON.parse(await result.blob.text());

        expect(content.root.children).toBeUndefined();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty children array', async () => {
      const emptyChildrenMindmap: MindmapData = {
        title: 'Empty Children',
        root: {
          id: '1',
          text: 'Root',
          children: [],
        },
      };

      const result = await exportMindmap(emptyChildrenMindmap, {
        format: 'json',
      });

      const content = JSON.parse(await result.blob.text());
      expect(content.root.children).toEqual([]);
    });

    it('should preserve node colors', async () => {
      const coloredMindmap: MindmapData = {
        title: 'Colored',
        root: {
          id: '1',
          text: 'Root',
          color: '#123456',
          children: [
            { id: '2', text: 'Red', color: '#ff0000' },
            { id: '3', text: 'Green', color: '#00ff00' },
          ],
        },
      };

      const jsonResult = await exportMindmap(coloredMindmap, { format: 'json' });
      const jsonContent = JSON.parse(await jsonResult.blob.text());
      expect(jsonContent.root.color).toBe('#123456');
      expect(jsonContent.root.children[0].color).toBe('#ff0000');

      const fmResult = await exportMindmap(coloredMindmap, { format: 'freemind' });
      const fmContent = await fmResult.blob.text();
      expect(fmContent).toContain('COLOR="#123456"');
      expect(fmContent).toContain('COLOR="#ff0000"');
    });

    it('should preserve collapsed state', async () => {
      const collapsedMindmap: MindmapData = {
        title: 'Collapsed',
        root: {
          id: '1',
          text: 'Root',
          collapsed: true,
          children: [{ id: '2', text: 'Hidden', collapsed: false }],
        },
      };

      const result = await exportMindmap(collapsedMindmap, { format: 'json' });
      const content = JSON.parse(await result.blob.text());

      expect(content.root.collapsed).toBe(true);
      expect(content.root.children[0].collapsed).toBe(false);
    });
  });
});
