/**
 * Tests for Mindmap Import Format Detection
 */

import { describe, it, expect } from 'vitest';
import { detectFormat } from '../format-detection';

describe('detectFormat', () => {
  describe('detection by file extension', () => {
    it('detects JSON format from .json extension', () => {
      expect(detectFormat('mindmap.json', '')).toBe('json');
    });

    it('detects Markdown from .md extension', () => {
      expect(detectFormat('mindmap.md', '')).toBe('markdown');
    });

    it('detects Markdown from .markdown extension', () => {
      expect(detectFormat('mindmap.markdown', '')).toBe('markdown');
    });

    it('detects FreeMind from .mm extension', () => {
      expect(detectFormat('mindmap.mm', '')).toBe('freemind');
    });

    it('detects XMind from .xmind extension', () => {
      expect(detectFormat('mindmap.xmind', '')).toBe('xmind');
    });

    it('detects text from .txt extension', () => {
      expect(detectFormat('mindmap.txt', '')).toBe('text');
    });

    it('is case insensitive for extensions', () => {
      expect(detectFormat('mindmap.JSON', '')).toBe('json');
      expect(detectFormat('mindmap.MD', '')).toBe('markdown');
    });
  });

  describe('detection by content', () => {
    it('detects JSON from content starting with {', () => {
      expect(detectFormat('unknown', '{"title": "test"}')).toBe('json');
    });

    it('detects JSON from content starting with [', () => {
      expect(detectFormat('unknown', '[{"id": 1}]')).toBe('json');
    });

    it('detects JSON with leading whitespace', () => {
      expect(detectFormat('unknown', '  { "key": "value" }')).toBe('json');
    });

    it('detects FreeMind XML from content', () => {
      expect(detectFormat('unknown', '<?xml version="1.0"?><map></map>')).toBe('freemind');
    });

    it('detects Markdown from content starting with #', () => {
      expect(detectFormat('unknown', '# Heading\n- item')).toBe('markdown');
    });

    it('detects Markdown from content with list items', () => {
      expect(detectFormat('unknown', 'Topic\n- item 1\n- item 2')).toBe('markdown');
    });

    it('defaults to text for unknown content', () => {
      expect(detectFormat('unknown', 'plain text content')).toBe('text');
    });
  });

  describe('edge cases', () => {
    it('handles files without extension', () => {
      expect(detectFormat('mindmap', '{"title": "test"}')).toBe('json');
    });

    it('handles empty filename', () => {
      expect(detectFormat('', '# Title')).toBe('markdown');
    });

    it('handles ArrayBuffer content', () => {
      const buffer = new ArrayBuffer(10);
      expect(detectFormat('unknown', buffer)).toBe('text');
    });

    it('prioritizes extension over content', () => {
      // .txt extension even though content looks like JSON
      expect(detectFormat('file.txt', '{"key": "value"}')).toBe('text');
    });

    it('handles multiple dots in filename', () => {
      expect(detectFormat('my.mindmap.file.json', '')).toBe('json');
    });
  });
});
