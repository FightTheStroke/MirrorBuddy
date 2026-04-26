import { describe, expect, it } from 'vitest';
import {
  ChatMessageRole,
  ChatMessageSchema,
  RequestedToolType,
  ChatRequestSchema,
} from '../schemas/chat';
import { VALIDATION_LIMITS } from '../common';

describe('Chat Validation Schemas', () => {
  describe('ChatMessageRole', () => {
    it('accepts valid roles', () => {
      expect(ChatMessageRole.parse('user')).toBe('user');
      expect(ChatMessageRole.parse('assistant')).toBe('assistant');
      expect(ChatMessageRole.parse('system')).toBe('system');
    });

    it('rejects invalid roles', () => {
      expect(() => ChatMessageRole.parse('invalid')).toThrow();
      expect(() => ChatMessageRole.parse('')).toThrow();
      expect(() => ChatMessageRole.parse(123)).toThrow();
    });
  });

  describe('ChatMessageSchema', () => {
    it('accepts valid message', () => {
      const validMessage = {
        role: 'user' as const,
        content: 'Hello, how are you?',
      };
      expect(() => ChatMessageSchema.parse(validMessage)).not.toThrow();
    });

    it('accepts message at max length', () => {
      const validMessage = {
        role: 'assistant' as const,
        content: 'a'.repeat(VALIDATION_LIMITS.MAX_MESSAGE_LENGTH),
      };
      expect(() => ChatMessageSchema.parse(validMessage)).not.toThrow();
    });

    it('rejects empty content', () => {
      const invalidMessage = {
        role: 'user' as const,
        content: '',
      };
      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow('Message content cannot be empty');
    });

    it('rejects content exceeding max length', () => {
      const invalidMessage = {
        role: 'user' as const,
        content: 'a'.repeat(VALIDATION_LIMITS.MAX_MESSAGE_LENGTH + 1),
      };
      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow();
    });

    it('rejects invalid role', () => {
      const invalidMessage = {
        role: 'invalid',
        content: 'Hello',
      };
      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow();
    });

    it('rejects missing role', () => {
      const invalidMessage = {
        content: 'Hello',
      };
      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow();
    });

    it('rejects missing content', () => {
      const invalidMessage = {
        role: 'user',
      };
      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow();
    });
  });

  describe('RequestedToolType', () => {
    it('accepts all valid tool types', () => {
      const validTools = [
        'mindmap',
        'quiz',
        'flashcard',
        'demo',
        'summary',
        'search',
        'pdf',
        'webcam',
        'homework',
        'study-kit',
      ];

      validTools.forEach(tool => {
        expect(RequestedToolType.parse(tool)).toBe(tool);
      });
    });

    it('rejects invalid tool types', () => {
      expect(() => RequestedToolType.parse('invalid')).toThrow();
      expect(() => RequestedToolType.parse('diagram')).toThrow();
      expect(() => RequestedToolType.parse('')).toThrow();
    });
  });

  describe('ChatRequestSchema', () => {
    const validRequest = {
      messages: [
        {
          role: 'user' as const,
          content: 'Hello',
        },
      ],
      systemPrompt: 'You are a helpful assistant',
      maestroId: 'socrates',
    };

    it('accepts valid chat request with required fields only', () => {
      expect(() => ChatRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('accepts valid chat request with all optional fields', () => {
      const fullRequest = {
        ...validRequest,
        enableTools: true,
        enableMemory: false,
        requestedTool: 'mindmap' as const,
      };
      expect(() => ChatRequestSchema.parse(fullRequest)).not.toThrow();
    });

    it('accepts messages at min and max bounds', () => {
      const minMessages = {
        ...validRequest,
        messages: [{ role: 'user' as const, content: 'Test' }],
      };
      expect(() => ChatRequestSchema.parse(minMessages)).not.toThrow();

      const maxMessages = {
        ...validRequest,
        messages: Array(VALIDATION_LIMITS.MAX_MESSAGES).fill({
          role: 'user' as const,
          content: 'Test',
        }),
      };
      expect(() => ChatRequestSchema.parse(maxMessages)).not.toThrow();
    });

    it('rejects empty messages array', () => {
      const invalidRequest = {
        ...validRequest,
        messages: [],
      };
      expect(() => ChatRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('rejects too many messages', () => {
      const invalidRequest = {
        ...validRequest,
        messages: Array(VALIDATION_LIMITS.MAX_MESSAGES + 1).fill({
          role: 'user' as const,
          content: 'Test',
        }),
      };
      expect(() => ChatRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('rejects empty system prompt', () => {
      const invalidRequest = {
        ...validRequest,
        systemPrompt: '',
      };
      expect(() => ChatRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('rejects system prompt exceeding max length', () => {
      const invalidRequest = {
        ...validRequest,
        systemPrompt: 'a'.repeat(VALIDATION_LIMITS.EXTRA_LONG_STRING_MAX + 1),
      };
      expect(() => ChatRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('rejects invalid maestroId', () => {
      const invalidRequest = {
        ...validRequest,
        maestroId: 'invalid-maestro',
      };
      expect(() => ChatRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('rejects missing required fields', () => {
      expect(() => ChatRequestSchema.parse({ messages: validRequest.messages })).toThrow();
      expect(() => ChatRequestSchema.parse({ systemPrompt: validRequest.systemPrompt })).toThrow();
      expect(() => ChatRequestSchema.parse({ maestroId: validRequest.maestroId })).toThrow();
    });

    it('rejects extra fields due to strict mode', () => {
      const invalidRequest = {
        ...validRequest,
        extraField: 'should not be here',
      };
      expect(() => ChatRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('accepts valid boolean values for optional fields', () => {
      const requestWithBooleans = {
        ...validRequest,
        enableTools: false,
        enableMemory: true,
      };
      expect(() => ChatRequestSchema.parse(requestWithBooleans)).not.toThrow();
    });

    it('rejects invalid type for enableTools', () => {
      const invalidRequest = {
        ...validRequest,
        enableTools: 'true',
      };
      expect(() => ChatRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('rejects invalid requestedTool type', () => {
      const invalidRequest = {
        ...validRequest,
        requestedTool: 'invalid-tool',
      };
      expect(() => ChatRequestSchema.parse(invalidRequest)).toThrow();
    });
  });
});
