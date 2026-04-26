/**
 * Tests for Mindmap Export Helpers
 */

import { describe, it, expect } from 'vitest';
import { sanitizeFilename, escapeXML, generateId } from '../helpers';

describe('sanitizeFilename', () => {
  it('removes dangerous characters', () => {
    expect(sanitizeFilename('file<>:"/\\|?*name')).toBe('filename');
  });

  it('replaces spaces with underscores', () => {
    expect(sanitizeFilename('my file name')).toBe('my_file_name');
  });

  it('collapses multiple spaces', () => {
    expect(sanitizeFilename('my   file   name')).toBe('my_file_name');
  });

  it('truncates long filenames to 100 characters', () => {
    const longName = 'a'.repeat(150);
    expect(sanitizeFilename(longName)).toHaveLength(100);
  });

  it('handles empty string', () => {
    expect(sanitizeFilename('')).toBe('');
  });

  it('preserves valid characters', () => {
    expect(sanitizeFilename('file-name_123.txt')).toBe('file-name_123.txt');
  });

  it('handles unicode characters', () => {
    expect(sanitizeFilename('café_文件')).toBe('café_文件');
  });
});

describe('escapeXML', () => {
  it('escapes ampersand', () => {
    expect(escapeXML('AT&T')).toBe('AT&amp;T');
  });

  it('escapes less than', () => {
    expect(escapeXML('1 < 2')).toBe('1 &lt; 2');
  });

  it('escapes greater than', () => {
    expect(escapeXML('2 > 1')).toBe('2 &gt; 1');
  });

  it('escapes double quotes', () => {
    expect(escapeXML('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeXML("it's")).toBe('it&apos;s');
  });

  it('escapes multiple special characters', () => {
    expect(escapeXML('<tag attr="val">text & more</tag>')).toBe(
      '&lt;tag attr=&quot;val&quot;&gt;text &amp; more&lt;/tag&gt;'
    );
  });

  it('preserves plain text', () => {
    expect(escapeXML('Hello World')).toBe('Hello World');
  });

  it('handles empty string', () => {
    expect(escapeXML('')).toBe('');
  });
});

describe('generateId', () => {
  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('starts with id_ prefix', () => {
    const id = generateId();
    expect(id.startsWith('id_')).toBe(true);
  });

  it('contains timestamp', () => {
    const before = Date.now();
    const id = generateId();
    const after = Date.now();

    // Extract timestamp from id (format: id_timestamp_uuid)
    const timestamp = parseInt(id.split('_')[1], 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('contains UUID portion', () => {
    const id = generateId();
    const parts = id.split('_');
    expect(parts.length).toBe(3);
    expect(parts[2]).toHaveLength(8);
  });
});
