/**
 * Edge case tests for TriggerDetector
 * Tests tokenization, special characters, and edge scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TriggerDetector } from '../trigger-detector';
import { ToolRegistry } from '../registry';
import { ToolCategory, Permission, ToolPlugin } from '../types';
import { z } from 'zod';

const createMockPlugin = (id: string, triggers: string[]): ToolPlugin => ({
  id,
  name: `Plugin ${id}`,
  category: ToolCategory.CREATION,
  schema: z.record(z.string(), z.unknown()),
  handler: async () => ({
    success: true,
    data: {},
    renderComponent: undefined,
  }),
  voicePrompt: 'Voice prompt',
  voiceFeedback: 'Voice feedback',
  triggers,
  prerequisites: [],
  permissions: [Permission.WRITE_CONTENT],
});

describe('TriggerDetector - Edge Cases', () => {
  let registry: ToolRegistry;
  let detector: TriggerDetector;

  beforeEach(() => {
    registry = ToolRegistry.getInstance();
    registry.clear();
    detector = new TriggerDetector(registry);
  });

  afterEach(() => {
    registry.clear();
  });

  describe('Tokenization and Punctuation', () => {
    it('should handle punctuation in transcript', () => {
      const plugin = createMockPlugin('test_tool', ['create summary']);
      registry.register(plugin);

      const transcript = 'create, please! summary...';
      const detected = detector.detectTriggers(transcript);

      expect(detected.length).toBeGreaterThan(0);
      expect(detected[0].toolId).toBe('test_tool');
    });

    it('should handle multiple spaces and tabs', () => {
      const plugin = createMockPlugin('test_tool', ['create summary']);
      registry.register(plugin);

      const transcript = 'create    \t\t  summary';
      const detected = detector.detectTriggers(transcript);

      expect(detected).toHaveLength(1);
      expect(detected[0].confidence).toBe(1.0);
    });

    it('should handle special characters', () => {
      const plugin = createMockPlugin('test_tool', ['create']);
      registry.register(plugin);

      const transcript = 'create@#$%^&*() something';
      const detected = detector.detectTriggers(transcript);

      expect(detected).toHaveLength(1);
      expect(detected[0].toolId).toBe('test_tool');
    });

    it('should handle numbers in transcript', () => {
      const plugin = createMockPlugin('test_tool', ['create items']);
      registry.register(plugin);

      const transcript = 'create 3 items now';
      const detected = detector.detectTriggers(transcript);

      expect(detected.length).toBeGreaterThan(0);
    });
  });

  describe('Confidence Scoring', () => {
    it('should assign highest confidence to exact match', () => {
      const plugin = createMockPlugin('test_tool', ['create summary']);
      registry.register(plugin);

      const detectedExact = detector.detectTriggers('create summary');
      const detectedPartial = detector.detectTriggers(
        'create and then summary the content'
      );

      expect(detectedExact[0].confidence).toBe(1.0);
      expect(detectedPartial[0].confidence).toBeLessThan(1.0);
    });

    it('should assign confidence less than 1.0 for partial matches', () => {
      const plugin = createMockPlugin('test_tool', ['create summary']);
      registry.register(plugin);

      const detected = detector.detectTriggers('please create and summary');
      if (detected.length > 0) {
        expect(detected[0].confidence).toBeGreaterThan(0);
        expect(detected[0].confidence).toBeLessThanOrEqual(0.9);
      }
    });

    it('should assign zero confidence for non-matches', () => {
      const plugin = createMockPlugin('test_tool', ['create summary']);
      registry.register(plugin);

      const detected = detector.detectTriggers('tell me a story');

      expect(detected).toHaveLength(0);
    });

    it('should sort results by confidence descending', () => {
      const plugin_one = createMockPlugin('plugin_one', ['make']);
      const plugin_two = createMockPlugin('plugin_two', ['create summary']);
      registry.register(plugin_one);
      registry.register(plugin_two);

      const detected = detector.detectTriggers('create summary');

      expect(detected.length).toBeGreaterThan(0);
      expect(detected[0].toolId).toBe('plugin_two');
      expect(detected[0].confidence).toBe(1.0);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle very long transcript', () => {
      const plugin = createMockPlugin('test_tool', ['create summary']);
      registry.register(plugin);

      const longTranscript =
        'I would like to create summary of a very long document that contains ' +
        'multiple paragraphs and important information that I need summarized ' +
        'for my study session';

      const detected = detector.detectTriggers(longTranscript);

      expect(detected).toHaveLength(1);
      expect(detected[0].toolId).toBe('test_tool');
    });

    it('should handle mixed case in transcript and trigger', () => {
      const plugin = createMockPlugin('test_tool', ['CrEaTe SuMmArY']);
      registry.register(plugin);

      const transcript = 'create summary please';
      const detected = detector.detectTriggers(transcript);

      expect(detected.length).toBeGreaterThan(0);
      expect(detected[0].confidence).toBeGreaterThan(0);
    });

    it('should handle repeated trigger words', () => {
      const plugin = createMockPlugin('test_tool', ['create']);
      registry.register(plugin);

      const transcript = 'create create create something';
      const detected = detector.detectTriggers(transcript);

      expect(detected).toHaveLength(1);
      expect(detected[0].toolId).toBe('test_tool');
    });

    it('should return single match even if trigger appears multiple times', () => {
      const plugin = createMockPlugin('test_tool', ['test']);
      registry.register(plugin);

      const transcript = 'test test test';
      const detected = detector.detectTriggers(transcript);

      expect(detected.filter(d => d.toolId === 'test_tool')).toHaveLength(1);
    });
  });
});
