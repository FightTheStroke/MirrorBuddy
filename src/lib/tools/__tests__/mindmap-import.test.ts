/**
 * Tests for mindmap import module
 * @module tools/mindmap-import
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import {
  importMindmap,
  validateMindmap,
  type ImportFormat,
} from '../mindmap-import';
import type { MindmapData } from '../mindmap-export';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Mindmap Import', () => {
  describe('importMindmap', () => {
    describe('JSON import', () => {
      it('should import valid JSON mindmap', async () => {
        const json = JSON.stringify({
          title: 'Test Mindmap',
          topic: 'Testing',
          root: {
            id: 'root-1',
            text: 'Root Node',
            children: [
              { id: 'child-1', text: 'Child 1' },
              { id: 'child-2', text: 'Child 2' },
            ],
          },
        });

        const result = await importMindmap(json, 'test.json');

        expect(result.success).toBe(true);
        expect(result.mindmap).toBeDefined();
        expect(result.mindmap?.title).toBe('Test Mindmap');
        expect(result.mindmap?.root.text).toBe('Root Node');
        expect(result.mindmap?.root.children).toHaveLength(2);
      });

      it('should import JSON with only root node', async () => {
        const json = JSON.stringify({
          text: 'Simple Root',
          children: [{ text: 'Child' }],
        });

        const result = await importMindmap(json, 'simple.json');

        expect(result.success).toBe(true);
        expect(result.mindmap?.title).toBe('Simple Root');
      });

      it('should fail for invalid JSON structure', async () => {
        const json = JSON.stringify({ invalid: 'structure' });

        const result = await importMindmap(json, 'invalid.json');

        expect(result.success).toBe(false);
        expect(result.error).toContain('root or title');
      });

      it('should fail for malformed JSON', async () => {
        const result = await importMindmap('not valid json', 'bad.json');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid JSON');
      });

      it('should add IDs to nodes without them', async () => {
        const json = JSON.stringify({
          title: 'No IDs',
          root: {
            text: 'Root',
            children: [{ text: 'Child without ID' }],
          },
        });

        const result = await importMindmap(json, 'noids.json');

        expect(result.success).toBe(true);
        expect(result.mindmap?.root.id).toBeDefined();
        expect(result.mindmap?.root.children?.[0].id).toBeDefined();
      });
    });

    describe('Markdown import', () => {
      it('should import markdown with heading hierarchy', async () => {
        const markdown = `# Main Topic

## First Section
- Item 1
- Item 2

## Second Section
- Item A
  - Sub A1
  - Sub A2
`;

        const result = await importMindmap(markdown, 'test.md');

        expect(result.success).toBe(true);
        expect(result.mindmap?.title).toBe('Main Topic');
        expect(result.mindmap?.root.children).toBeDefined();
        expect(result.mindmap?.root.children?.length).toBeGreaterThan(0);
      });

      it('should import markdown with list-based hierarchy', async () => {
        const markdown = `# Root
- Level 1 A
  - Level 2 A
  - Level 2 B
- Level 1 B
`;

        const result = await importMindmap(markdown, 'list.md');

        expect(result.success).toBe(true);
        expect(result.mindmap?.root.text).toBe('Root');
        const children = result.mindmap?.root.children;
        expect(children?.length).toBe(2);
        expect(children?.[0].text).toBe('Level 1 A');
        expect(children?.[0].children?.length).toBe(2);
      });

      it('should skip blockquotes', async () => {
        const markdown = `# Title
> This is a quote
- Actual content
`;

        const result = await importMindmap(markdown, 'quote.md');

        expect(result.success).toBe(true);
        const hasQuote = result.mindmap?.root.children?.some(
          (c) => c.text.includes('quote')
        );
        expect(hasQuote).toBeFalsy();
      });

      it('should warn when no children found', async () => {
        const markdown = `# Only Title`;

        const result = await importMindmap(markdown, 'empty.md');

        expect(result.success).toBe(true);
        expect(result.warnings).toBeDefined();
        expect(result.warnings).toContain('No child nodes found in markdown');
      });
    });

    describe('FreeMind import', () => {
      it('should import FreeMind XML format', async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.0.1">
  <node TEXT="Central Topic">
    <node TEXT="Branch 1" POSITION="right">
      <node TEXT="Leaf 1"/>
    </node>
    <node TEXT="Branch 2" POSITION="left"/>
  </node>
</map>`;

        const result = await importMindmap(xml, 'test.mm');

        expect(result.success).toBe(true);
        expect(result.mindmap?.title).toBe('Central Topic');
        expect(result.mindmap?.root.children).toHaveLength(2);
      });

      it('should preserve colors from FreeMind', async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.0.1">
  <node TEXT="Root" COLOR="#ff0000">
    <node TEXT="Child" COLOR="#00ff00"/>
  </node>
</map>`;

        const result = await importMindmap(xml, 'colored.mm');

        expect(result.success).toBe(true);
        expect(result.mindmap?.root.color).toBe('#ff0000');
        expect(result.mindmap?.root.children?.[0].color).toBe('#00ff00');
      });

      it('should fail for invalid XML', async () => {
        const xml = `<invalid>not closed`;

        const result = await importMindmap(xml, 'bad.mm', { format: 'freemind' });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should fail for XML without map element', async () => {
        const xml = `<?xml version="1.0"?><other>content</other>`;

        const result = await importMindmap(xml, 'nomap.mm', { format: 'freemind' });

        expect(result.success).toBe(false);
        expect(result.error).toContain('No <map> element');
      });
    });

    describe('XMind import', () => {
      it('should import XMind JSON format', async () => {
        const xmindJson = JSON.stringify([
          {
            id: 'sheet-1',
            title: 'Sheet 1',
            rootTopic: {
              id: 'topic-1',
              title: 'Central Topic',
              children: {
                attached: [
                  { id: 'topic-2', title: 'Branch 1' },
                  { id: 'topic-3', title: 'Branch 2' },
                ],
              },
            },
          },
        ]);

        const result = await importMindmap(xmindJson, 'test.xmind', {
          format: 'xmind',
        });

        expect(result.success).toBe(true);
        expect(result.mindmap?.title).toBe('Sheet 1');
        expect(result.mindmap?.root.text).toBe('Central Topic');
        expect(result.mindmap?.root.children).toHaveLength(2);
      });

      it('should fail for invalid XMind structure', async () => {
        const invalid = JSON.stringify({ invalid: 'structure' });

        const result = await importMindmap(invalid, 'bad.xmind', {
          format: 'xmind',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('missing rootTopic');
      });
    });

    describe('Plain text import', () => {
      it('should import indentation-based text', async () => {
        const text = `Main Topic
  Branch A
    Leaf A1
    Leaf A2
  Branch B
`;

        const result = await importMindmap(text, 'test.txt');

        expect(result.success).toBe(true);
        expect(result.mindmap?.title).toBe('Main Topic');
        expect(result.mindmap?.root.children?.length).toBe(2);
        expect(result.mindmap?.root.children?.[0].text).toBe('Branch A');
      });

      it('should handle bullet points in text', async () => {
        const text = `Root
- Item 1
- Item 2
  - Sub Item
`;

        const result = await importMindmap(text, 'bullets.txt');

        expect(result.success).toBe(true);
        expect(result.mindmap?.root.children?.length).toBe(2);
      });

      it('should fail for empty content', async () => {
        const result = await importMindmap('', 'empty.txt');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Empty content');
      });

      it('should handle whitespace-only lines', async () => {
        const text = `Root

  Child

`;

        const result = await importMindmap(text, 'spaces.txt');

        expect(result.success).toBe(true);
        expect(result.mindmap?.root.children?.[0].text).toBe('Child');
      });
    });

    describe('Format detection', () => {
      it('should auto-detect JSON from extension', async () => {
        const json = JSON.stringify({ title: 'Auto', root: { text: 'Root', id: '1' } });
        const result = await importMindmap(json, 'auto.json');

        expect(result.success).toBe(true);
      });

      it('should auto-detect markdown from extension', async () => {
        const md = '# Title\n- Item';
        const result = await importMindmap(md, 'auto.md');

        expect(result.success).toBe(true);
      });

      it('should auto-detect JSON from content', async () => {
        const json = JSON.stringify({ title: 'Auto', root: { text: 'Root', id: '1' } });
        const result = await importMindmap(json, 'unknown.xyz');

        expect(result.success).toBe(true);
      });

      it('should auto-detect FreeMind from content', async () => {
        const xml = `<?xml version="1.0"?><map version="1.0"><node TEXT="Root"/></map>`;
        const result = await importMindmap(xml, 'unknown.xyz');

        expect(result.success).toBe(true);
      });

      it('should fall back to text format', async () => {
        const text = 'Just some text\n  with indentation';
        const result = await importMindmap(text, 'unknown.xyz');

        expect(result.success).toBe(true);
      });
    });

    describe('Error handling', () => {
      it('should return error for unsupported format', async () => {
        const result = await importMindmap('content', 'test.xyz', {
          format: 'invalid' as ImportFormat,
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Unsupported format');
      });

      it('should catch and return thrown errors', async () => {
        // Force an error by passing invalid XML with freemind format
        const result = await importMindmap('<invalid', 'test.mm', {
          format: 'freemind',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('validateMindmap', () => {
    it('should validate correct mindmap structure', () => {
      const mindmap: MindmapData = {
        title: 'Valid',
        root: {
          id: 'root-1',
          text: 'Root',
          children: [
            { id: 'child-1', text: 'Child' },
          ],
        },
      };

      const result = validateMindmap(mindmap);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing title', () => {
      const mindmap = {
        title: '',
        root: { id: '1', text: 'Root' },
      } as MindmapData;

      const result = validateMindmap(mindmap);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing title');
    });

    it('should detect missing root', () => {
      const mindmap = {
        title: 'No Root',
        root: undefined,
      } as unknown as MindmapData;

      const result = validateMindmap(mindmap);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing root node');
    });

    it('should detect missing root text', () => {
      const mindmap = {
        title: 'No Text',
        root: { id: '1', text: '' },
      } as MindmapData;

      const result = validateMindmap(mindmap);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('missing text'))).toBe(true);
    });

    it('should detect missing node IDs', () => {
      const mindmap = {
        title: 'Missing IDs',
        root: {
          id: '',
          text: 'Root',
          children: [{ id: '', text: 'Child' }],
        },
      } as MindmapData;

      const result = validateMindmap(mindmap);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('missing id'))).toBe(true);
    });

    it('should validate nested children', () => {
      const mindmap: MindmapData = {
        title: 'Deep',
        root: {
          id: '1',
          text: 'Root',
          children: [
            {
              id: '2',
              text: 'Level 1',
              children: [
                {
                  id: '', // Missing ID
                  text: 'Level 2',
                },
              ],
            },
          ],
        },
      };

      const result = validateMindmap(mindmap);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('children[0].children[0]'))).toBe(true);
    });
  });
});
