/**
 * Accessible Print Helpers Tests
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeFilename } from '../helpers';

describe('accessible-print helpers', () => {
  describe('escapeHtml', () => {
    it('should escape ampersand', () => {
      const result = escapeHtml('A & B');
      expect(result).toBe('A &amp; B');
    });

    it('should escape less than symbol', () => {
      const result = escapeHtml('a < b');
      expect(result).toBe('a &lt; b');
    });

    it('should escape greater than symbol', () => {
      const result = escapeHtml('a > b');
      expect(result).toBe('a &gt; b');
    });

    it('should escape double quotes', () => {
      const result = escapeHtml('say "hello"');
      expect(result).toBe('say &quot;hello&quot;');
    });

    it('should escape single quotes', () => {
      const result = escapeHtml("it's");
      expect(result).toBe('it&#039;s');
    });

    it('should escape multiple special characters', () => {
      const result = escapeHtml('<script>alert("xss")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should handle empty string', () => {
      const result = escapeHtml('');
      expect(result).toBe('');
    });

    it('should handle string with no special characters', () => {
      const result = escapeHtml('Hello World');
      expect(result).toBe('Hello World');
    });

    it('should handle HTML entities mixed with text', () => {
      const result = escapeHtml('1 < 2 && 3 > 2');
      expect(result).toBe('1 &lt; 2 &amp;&amp; 3 &gt; 2');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove invalid characters', () => {
      const result = sanitizeFilename('file<name>.txt');
      expect(result).toBe('filename.txt');
    });

    it('should remove colon', () => {
      const result = sanitizeFilename('file:name');
      expect(result).toBe('filename');
    });

    it('should remove double quotes', () => {
      const result = sanitizeFilename('file"name');
      expect(result).toBe('filename');
    });

    it('should remove forward and back slashes', () => {
      const result = sanitizeFilename('path/to\\file');
      expect(result).toBe('pathtofile');
    });

    it('should remove pipe character', () => {
      const result = sanitizeFilename('file|name');
      expect(result).toBe('filename');
    });

    it('should remove question mark', () => {
      const result = sanitizeFilename('file?name');
      expect(result).toBe('filename');
    });

    it('should remove asterisk', () => {
      const result = sanitizeFilename('file*name');
      expect(result).toBe('filename');
    });

    it('should replace spaces with underscores', () => {
      const result = sanitizeFilename('my file name');
      expect(result).toBe('my_file_name');
    });

    it('should collapse multiple spaces into single underscore', () => {
      const result = sanitizeFilename('my   file   name');
      expect(result).toBe('my_file_name');
    });

    it('should truncate to 100 characters', () => {
      const longName = 'a'.repeat(150);
      const result = sanitizeFilename(longName);
      expect(result.length).toBe(100);
    });

    it('should handle empty string', () => {
      const result = sanitizeFilename('');
      expect(result).toBe('');
    });

    it('should handle string with all invalid characters', () => {
      const result = sanitizeFilename('<>:"/\\|?*');
      expect(result).toBe('');
    });

    it('should handle combination of operations', () => {
      const result = sanitizeFilename('My <File>: "Test" | Copy?.txt');
      expect(result).toBe('My_File_Test_Copy.txt');
    });
  });
});
