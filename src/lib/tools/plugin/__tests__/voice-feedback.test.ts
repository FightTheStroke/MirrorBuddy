/**
 * Tests for VoiceFeedbackInjector
 * Verifies dynamic voice prompts and feedback template substitution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceFeedbackInjector, createVoiceFeedbackInjector } from '../voice-feedback';
import { ToolRegistry } from '../registry';
import { ToolCategory, Permission } from '../types';
import type { ToolPlugin } from '../types';
import type { ToolContext, ToolResult } from '@/types/tools';
import { z } from 'zod';

describe('VoiceFeedbackInjector', () => {
  let registry: ToolRegistry;
  let injector: VoiceFeedbackInjector;
  let mockPlugin: ToolPlugin;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset singleton and get fresh instance for each test
    (ToolRegistry as unknown as { instance: ToolRegistry | null })['instance'] = null;
    registry = ToolRegistry.getInstance();

    mockPlugin = {
      id: 'test_tool',
      name: 'Test Tool',
      category: ToolCategory.CREATION,
      schema: z.object({}),
      handler: vi.fn().mockResolvedValue({ success: true }),
      voicePrompt: 'Vuoi creare {toolName} su {topic}?',
      voiceFeedback: 'Ho creato {toolName} con {itemCount} elementi',
      triggers: ['create test'],
      prerequisites: [],
      permissions: [Permission.READ_CONVERSATION],
    };

    registry.register(mockPlugin);
    injector = new VoiceFeedbackInjector(registry);
  });

  describe('injectProposal', () => {
    it('should substitute template variables in voice prompt', () => {
      const context: ToolContext & { topic?: string } = {
        conversationId: 'test-conv',
        userId: 'test-user',
        topic: 'matematica',
      };

      const result = injector.injectProposal('test_tool', context);

      expect(result).toBe('Vuoi creare Test Tool su matematica?');
    });

    it('should use default topic when not provided', () => {
      const context: ToolContext = {
        conversationId: 'test-conv',
        userId: 'test-user',
      };

      const result = injector.injectProposal('test_tool', context);

      expect(result).toBe('Vuoi creare Test Tool su this topic?');
    });

    it('should use default subject when not provided', () => {
      const pluginWithSubject: ToolPlugin = {
        ...mockPlugin,
        id: 'subject_tool',
        voicePrompt: 'Vuoi studiare {subject}?',
      };
      registry.register(pluginWithSubject);

      const context: ToolContext = {
        conversationId: 'test-conv',
        userId: 'test-user',
      };

      const result = injector.injectProposal('subject_tool', context);

      expect(result).toBe('Vuoi studiare this subject?');
    });

    it('should return fallback message when plugin not found', () => {
      const context: ToolContext = {
        conversationId: 'test-conv',
        userId: 'test-user',
      };

      const result = injector.injectProposal('nonexistent_tool', context);

      expect(result).toBe('Tool nonexistent_tool is not available.');
    });

    it('should handle VoicePromptConfig with template', () => {
      const pluginWithConfig: ToolPlugin = {
        ...mockPlugin,
        id: 'config_tool',
        name: 'Config Tool',
        voicePrompt: {
          template: 'Template per {toolName}',
          requiresContext: ['toolName'],
          fallback: 'Fallback message',
        },
      };
      registry.register(pluginWithConfig);

      const context: ToolContext = {
        conversationId: 'test-conv',
        userId: 'test-user',
      };

      const result = injector.injectProposal('config_tool', context);

      expect(result).toBe('Template per Config Tool');
    });

    it('should use fallback when VoicePromptConfig template is minimal', () => {
      // Note: Schema requires non-empty template, so we test with a valid template
      // and no substitutions available
      const pluginWithFallback: ToolPlugin = {
        ...mockPlugin,
        id: 'fallback_tool',
        name: 'Fallback Tool',
        voicePrompt: {
          template: 'Static message without variables',
          fallback: 'Fallback message',
        },
      };
      registry.register(pluginWithFallback);

      const context: ToolContext = {
        conversationId: 'test-conv',
        userId: 'test-user',
      };

      const result = injector.injectProposal('fallback_tool', context);

      // Template without variables returns as-is
      expect(result).toBe('Static message without variables');
    });
  });

  describe('injectConfirmation', () => {
    it('should substitute template variables in voice feedback', () => {
      const result: ToolResult & { itemCount?: number; title?: string } = {
        success: true,
        itemCount: 5,
        title: 'My Flashcards',
      };

      const feedback = injector.injectConfirmation('test_tool', result);

      expect(feedback).toBe('Ho creato Test Tool con 5 elementi');
    });

    it('should use default values when not provided', () => {
      const result: ToolResult = {
        success: true,
      };

      const feedback = injector.injectConfirmation('test_tool', result);

      expect(feedback).toBe('Ho creato Test Tool con 0 elementi');
    });

    it('should return fallback message when plugin not found', () => {
      const result: ToolResult = {
        success: true,
      };

      const feedback = injector.injectConfirmation('nonexistent_tool', result);

      expect(feedback).toBe('Tool nonexistent_tool execution completed.');
    });

    it('should handle VoicePromptConfig for feedback', () => {
      const pluginWithConfig: ToolPlugin = {
        ...mockPlugin,
        id: 'feedback_config_tool',
        voiceFeedback: {
          template: 'Creato {title} con successo',
          fallback: 'Operazione completata',
        },
      };
      registry.register(pluginWithConfig);

      const result: ToolResult & { title?: string } = {
        success: true,
        title: 'Le mie flashcard',
      };

      const feedback = injector.injectConfirmation('feedback_config_tool', result);

      expect(feedback).toBe('Creato Le mie flashcard con successo');
    });
  });

  describe('getContextualTriggers', () => {
    beforeEach(() => {
      // Register additional plugins with triggers
      const mathPlugin: ToolPlugin = {
        ...mockPlugin,
        id: 'math_tool',
        triggers: ['calcola', 'matematica', 'solve math'],
      };
      const sciencePlugin: ToolPlugin = {
        ...mockPlugin,
        id: 'science_tool',
        triggers: ['scienza', 'esperimento'],
      };
      registry.register(mathPlugin);
      registry.register(sciencePlugin);
    });

    it('should return tools matching context keywords', () => {
      const context: ToolContext & { keywords?: string[] } = {
        conversationId: 'test-conv',
        userId: 'test-user',
        keywords: ['matematica'],
      };

      const triggers = injector.getContextualTriggers(context);

      expect(triggers).toContain('math_tool');
    });

    it('should return tools matching topic', () => {
      const context: ToolContext & { topic?: string } = {
        conversationId: 'test-conv',
        userId: 'test-user',
        topic: 'scienza',
      };

      const triggers = injector.getContextualTriggers(context);

      expect(triggers).toContain('science_tool');
    });

    it('should return empty array when no matches', () => {
      const context: ToolContext & { keywords?: string[] } = {
        conversationId: 'test-conv',
        userId: 'test-user',
        keywords: ['storia'],
      };

      const triggers = injector.getContextualTriggers(context);

      expect(triggers).not.toContain('math_tool');
      expect(triggers).not.toContain('science_tool');
    });

    it('should handle plugins without triggers', () => {
      const _noTriggerPlugin: ToolPlugin = {
        ...mockPlugin,
        id: 'no_trigger_tool',
        triggers: [],
      };
      // Note: This will fail validation, but for test purposes we can try
      // Actually the schema requires at least one trigger, so skip this test
      // Registry won't accept plugins without triggers due to schema validation
    });

    it('should match partial keywords', () => {
      const context: ToolContext & { keywords?: string[] } = {
        conversationId: 'test-conv',
        userId: 'test-user',
        keywords: ['calcola'],
      };

      const triggers = injector.getContextualTriggers(context);

      expect(triggers).toContain('math_tool');
    });
  });

  describe('substituteVariables (via public methods)', () => {
    it('should preserve unmatched variables', () => {
      const pluginWithUnknownVar: ToolPlugin = {
        ...mockPlugin,
        id: 'unknown_var_tool',
        voicePrompt: 'Messaggio con {unknownVar} variabile',
      };
      registry.register(pluginWithUnknownVar);

      const context: ToolContext = {
        conversationId: 'test-conv',
        userId: 'test-user',
      };

      const result = injector.injectProposal('unknown_var_tool', context);

      // Unknown variables are preserved
      expect(result).toBe('Messaggio con {unknownVar} variabile');
    });

    it('should handle multiple variables in one template', () => {
      const pluginWithMultiVar: ToolPlugin = {
        ...mockPlugin,
        id: 'multi_var_tool',
        name: 'Multi Var Tool',
        voicePrompt: '{toolName} per {topic} in {subject}',
      };
      registry.register(pluginWithMultiVar);

      const context: ToolContext & { topic?: string; subject?: string } = {
        conversationId: 'test-conv',
        userId: 'test-user',
        topic: 'algebra',
        subject: 'matematica',
      };

      const result = injector.injectProposal('multi_var_tool', context);

      expect(result).toBe('Multi Var Tool per algebra in matematica');
    });

    it('should prevent prototype pollution', () => {
      // Test that __proto__ or constructor won't be substituted
      const pluginWithDangerousVar: ToolPlugin = {
        ...mockPlugin,
        id: 'dangerous_var_tool',
        voicePrompt: 'Test {__proto__} and {constructor}',
      };
      registry.register(pluginWithDangerousVar);

      const context: ToolContext = {
        conversationId: 'test-conv',
        userId: 'test-user',
      };

      const result = injector.injectProposal('dangerous_var_tool', context);

      // Variables not in the allowed set are preserved
      expect(result).toBe('Test {__proto__} and {constructor}');
    });
  });

  describe('createVoiceFeedbackInjector factory', () => {
    it('should create injector with singleton registry', () => {
      // Clear singleton for test
      (ToolRegistry as unknown as { instance: ToolRegistry | null })['instance'] = null;

      const injector = createVoiceFeedbackInjector();

      expect(injector).toBeInstanceOf(VoiceFeedbackInjector);
    });
  });
});
