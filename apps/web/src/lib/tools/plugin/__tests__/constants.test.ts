/**
 * Tests for Tool Plugin Constants and Sanitization Functions
 * Verifies security sanitization and validation patterns
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  sanitizeObject,
  MAX_TRANSCRIPT_LENGTH,
  MAX_MESSAGE_SIZE,
  DEFAULT_EXECUTION_TIMEOUT,
  MAX_TOOL_ID_LENGTH,
  MAX_TEMPLATE_LENGTH,
  TOOL_ID_PATTERN,
  TEMPLATE_VAR_PATTERN,
  ERROR_MESSAGES_IT,
  VOICE_MESSAGES,
  VOICE_FLOW_MESSAGES_IT,
  CATEGORY_LABELS_IT,
} from '../constants';

describe('Security Constants', () => {
  it('should have reasonable MAX_TRANSCRIPT_LENGTH', () => {
    expect(MAX_TRANSCRIPT_LENGTH).toBe(10000);
    expect(typeof MAX_TRANSCRIPT_LENGTH).toBe('number');
  });

  it('should have reasonable MAX_MESSAGE_SIZE', () => {
    expect(MAX_MESSAGE_SIZE).toBe(65536); // 64KB
    expect(typeof MAX_MESSAGE_SIZE).toBe('number');
  });

  it('should have reasonable DEFAULT_EXECUTION_TIMEOUT', () => {
    expect(DEFAULT_EXECUTION_TIMEOUT).toBe(30000); // 30 seconds
    expect(typeof DEFAULT_EXECUTION_TIMEOUT).toBe('number');
  });

  it('should have reasonable MAX_TOOL_ID_LENGTH', () => {
    expect(MAX_TOOL_ID_LENGTH).toBe(64);
    expect(typeof MAX_TOOL_ID_LENGTH).toBe('number');
  });

  it('should have reasonable MAX_TEMPLATE_LENGTH', () => {
    expect(MAX_TEMPLATE_LENGTH).toBe(500);
    expect(typeof MAX_TEMPLATE_LENGTH).toBe('number');
  });
});

describe('Validation Patterns', () => {
  describe('TOOL_ID_PATTERN', () => {
    it('should match lowercase alphanumeric with underscores', () => {
      expect(TOOL_ID_PATTERN.test('create_flashcard')).toBe(true);
      expect(TOOL_ID_PATTERN.test('mindmap')).toBe(true);
      expect(TOOL_ID_PATTERN.test('quiz_tool')).toBe(true);
    });

    it('should reject uppercase letters', () => {
      expect(TOOL_ID_PATTERN.test('CreateFlashcard')).toBe(false);
      expect(TOOL_ID_PATTERN.test('MINDMAP')).toBe(false);
    });

    it('should reject numbers', () => {
      expect(TOOL_ID_PATTERN.test('tool123')).toBe(false);
      expect(TOOL_ID_PATTERN.test('1tool')).toBe(false);
    });

    it('should reject special characters', () => {
      expect(TOOL_ID_PATTERN.test('tool-name')).toBe(false);
      expect(TOOL_ID_PATTERN.test('tool.name')).toBe(false);
      expect(TOOL_ID_PATTERN.test('tool name')).toBe(false);
    });
  });

  describe('TEMPLATE_VAR_PATTERN', () => {
    it('should match valid template variables', () => {
      const matches = 'Hello {name} and {toolName}'.match(TEMPLATE_VAR_PATTERN);
      expect(matches).toHaveLength(2);
      expect(matches).toContain('{name}');
      expect(matches).toContain('{toolName}');
    });

    it('should match variables starting with underscore', () => {
      const matches = 'Value: {_private}'.match(TEMPLATE_VAR_PATTERN);
      expect(matches).toHaveLength(1);
      expect(matches).toContain('{_private}');
    });

    it('should match alphanumeric variables', () => {
      const matches = 'Value: {count1} and {item2}'.match(TEMPLATE_VAR_PATTERN);
      expect(matches).toHaveLength(2);
    });

    it('should not match invalid patterns', () => {
      // Starting with number
      const matches = 'Invalid: {1var}'.match(TEMPLATE_VAR_PATTERN);
      expect(matches).toBeNull();
    });
  });
});

describe('sanitizeInput', () => {
  it('should escape HTML entities', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    );
  });

  it('should escape ampersands', () => {
    expect(sanitizeInput('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape quotes', () => {
    expect(sanitizeInput("It's a \"test\"")).toBe('It&#x27;s a &quot;test&quot;');
  });

  it('should escape forward slashes', () => {
    expect(sanitizeInput('path/to/file')).toBe('path&#x2F;to&#x2F;file');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeInput(null as unknown as string)).toBe('');
    expect(sanitizeInput(undefined as unknown as string)).toBe('');
    expect(sanitizeInput(123 as unknown as string)).toBe('');
    expect(sanitizeInput({} as unknown as string)).toBe('');
  });

  it('should handle empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('should preserve safe characters', () => {
    expect(sanitizeInput('Hello World 123')).toBe('Hello World 123');
  });
});

describe('sanitizeObject', () => {
  it('should sanitize string values in object', () => {
    const input = {
      name: '<script>xss</script>',
      description: 'Safe text',
    };

    const result = sanitizeObject(input);

    expect(result.name).toBe('&lt;script&gt;xss&lt;&#x2F;script&gt;');
    expect(result.description).toBe('Safe text');
  });

  it('should preserve non-string values', () => {
    const input = {
      count: 42,
      active: true,
      data: null,
    };

    const result = sanitizeObject(input);

    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.data).toBeNull();
  });

  it('should recursively sanitize nested objects', () => {
    const input = {
      outer: 'safe',
      nested: {
        inner: '<b>bold</b>',
        deepNested: {
          value: '<i>italic</i>',
        },
      },
    };

    const result = sanitizeObject(input);

    expect(result.nested.inner).toBe('&lt;b&gt;bold&lt;&#x2F;b&gt;');
    expect(result.nested.deepNested.value).toBe('&lt;i&gt;italic&lt;&#x2F;i&gt;');
  });

  it('should not modify arrays', () => {
    const input = {
      items: ['<script>', 'safe'],
    };

    const result = sanitizeObject(input);

    // Arrays are not recursively sanitized (by design)
    expect(result.items).toEqual(['<script>', 'safe']);
  });

  it('should handle empty objects', () => {
    const result = sanitizeObject({});
    expect(result).toEqual({});
  });
});

describe('Localized Messages', () => {
  describe('ERROR_MESSAGES_IT', () => {
    it('should have all error codes defined', () => {
      expect(ERROR_MESSAGES_IT.PLUGIN_NOT_FOUND).toBeDefined();
      expect(ERROR_MESSAGES_IT.VALIDATION_FAILED).toBeDefined();
      expect(ERROR_MESSAGES_IT.PREREQUISITES_NOT_MET).toBeDefined();
      expect(ERROR_MESSAGES_IT.PERMISSION_DENIED).toBeDefined();
      expect(ERROR_MESSAGES_IT.EXECUTION_FAILED).toBeDefined();
      expect(ERROR_MESSAGES_IT.TIMEOUT).toBeDefined();
      expect(ERROR_MESSAGES_IT.UNKNOWN).toBeDefined();
    });

    it('should have Italian messages', () => {
      // Check for Italian language patterns
      expect(ERROR_MESSAGES_IT.PLUGIN_NOT_FOUND).toContain('strumento');
      expect(ERROR_MESSAGES_IT.VALIDATION_FAILED).toContain('parametri');
    });
  });

  describe('VOICE_MESSAGES', () => {
    it('should have tool availability message function', () => {
      const message = VOICE_MESSAGES.TOOL_NOT_AVAILABLE('test_tool');
      expect(message).toContain('test_tool');
    });

    it('should have tool execution completed function', () => {
      const message = VOICE_MESSAGES.TOOL_EXECUTION_COMPLETED('create_flashcard');
      expect(message).toContain('create_flashcard');
    });

    it('should have default success message', () => {
      expect(VOICE_MESSAGES.DEFAULT_SUCCESS).toBeDefined();
    });

    it('should have execution fallback message', () => {
      expect(VOICE_MESSAGES.EXECUTION_COMPLETED_FALLBACK).toBeDefined();
    });
  });

  describe('VOICE_FLOW_MESSAGES_IT', () => {
    it('should have no trigger detected message', () => {
      expect(VOICE_FLOW_MESSAGES_IT.NO_TRIGGER_DETECTED).toBeDefined();
    });

    it('should have unclear request message', () => {
      expect(VOICE_FLOW_MESSAGES_IT.UNCLEAR_REQUEST).toBeDefined();
    });

    it('should have execution error message', () => {
      expect(VOICE_FLOW_MESSAGES_IT.EXECUTION_ERROR).toBeDefined();
    });
  });

  describe('CATEGORY_LABELS_IT', () => {
    it('should have category labels', () => {
      expect(CATEGORY_LABELS_IT.create).toBe('Crea');
      expect(CATEGORY_LABELS_IT.upload).toBe('Carica');
      expect(CATEGORY_LABELS_IT.search).toBe('Ricerca');
      expect(CATEGORY_LABELS_IT.other).toBe('Strumenti');
    });
  });
});
