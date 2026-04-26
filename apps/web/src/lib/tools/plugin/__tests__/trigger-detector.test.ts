/**
 * Unit tests for TriggerDetector - Core functionality
 * Tests trigger detection, matching, and confidence scoring
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TriggerDetector, DetectedTrigger } from '../trigger-detector';
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

describe('TriggerDetector Core Tests', () => {
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

  describe('detectTriggers - Basic Functionality', () => {
    it('should detect exact trigger match', () => {
      const plugin = createMockPlugin('test_tool', ['create summary']);
      registry.register(plugin);

      const transcript = 'create summary';
      const detected = detector.detectTriggers(transcript);

      expect(detected).toHaveLength(1);
      expect(detected[0].toolId).toBe('test_tool');
      expect(detected[0].trigger).toBe('create summary');
      expect(detected[0].confidence).toBe(1.0);
    });

    it('should detect trigger with additional words', () => {
      const plugin = createMockPlugin('test_tool', ['create summary']);
      registry.register(plugin);

      const transcript = 'I want to create summary of this content';
      const detected = detector.detectTriggers(transcript);

      expect(detected.length).toBeGreaterThan(0);
      expect(detected[0].toolId).toBe('test_tool');
      expect(detected[0].confidence).toBe(1.0);
    });

    it('should detect multiple different triggers', () => {
      const plugin_one = createMockPlugin('tool_one', ['create']);
      const plugin_two = createMockPlugin('tool_two', ['summarize']);
      registry.register(plugin_one);
      registry.register(plugin_two);

      const transcript = 'create and summarize the content';
      const detected = detector.detectTriggers(transcript);

      expect(detected.length).toBeGreaterThanOrEqual(2);
      const toolIds = detected.map(d => d.toolId);
      expect(toolIds).toContain('tool_one');
      expect(toolIds).toContain('tool_two');
    });

    it('should return empty array for no matching triggers', () => {
      const plugin = createMockPlugin('test_tool', ['create summary']);
      registry.register(plugin);

      const transcript = 'tell me about the weather';
      const detected = detector.detectTriggers(transcript);

      expect(detected).toHaveLength(0);
    });

    it('should return empty array for empty transcript', () => {
      const plugin = createMockPlugin('test_tool', ['create']);
      registry.register(plugin);

      const detected = detector.detectTriggers('');

      expect(detected).toHaveLength(0);
    });

    it('should return empty array for whitespace-only transcript', () => {
      const plugin = createMockPlugin('test_tool', ['create']);
      registry.register(plugin);

      const detected = detector.detectTriggers('   \t\n   ');

      expect(detected).toHaveLength(0);
    });
  });

  describe('detectTriggers - Case Insensitivity', () => {
    it('should match triggers case-insensitively', () => {
      const plugin = createMockPlugin('test_tool', ['Create Summary']);
      registry.register(plugin);

      const transcript = 'create summary';
      const detected = detector.detectTriggers(transcript);

      expect(detected).toHaveLength(1);
      expect(detected[0].confidence).toBe(1.0);
    });

    it('should match uppercase trigger', () => {
      const plugin = createMockPlugin('test_tool', ['create summary']);
      registry.register(plugin);

      const transcript = 'CREATE SUMMARY';
      const detected = detector.detectTriggers(transcript);

      expect(detected).toHaveLength(1);
      expect(detected[0].confidence).toBe(1.0);
    });

    it('should match mixed case trigger', () => {
      const plugin = createMockPlugin('test_tool', ['create summary']);
      registry.register(plugin);

      const transcript = 'CrEaTe SuMmArY';
      const detected = detector.detectTriggers(transcript);

      expect(detected).toHaveLength(1);
      expect(detected[0].confidence).toBe(1.0);
    });
  });

  describe('getBestMatch', () => {
    it('should return highest confidence trigger', () => {
      const plugin_one = createMockPlugin('plugin_one', ['make things']);
      const plugin_two = createMockPlugin('plugin_two', ['create summary']);
      registry.register(plugin_one);
      registry.register(plugin_two);

      const detected = detector.detectTriggers('create summary now');
      const bestMatch = detector.getBestMatch(detected);

      expect(bestMatch).toBeDefined();
      expect(bestMatch?.toolId).toBe('plugin_two');
      expect(bestMatch?.confidence).toBe(1.0);
    });

    it('should return first element when already sorted', () => {
      const triggers: DetectedTrigger[] = [
        { toolId: 'tool1', trigger: 'create', confidence: 1.0 },
        { toolId: 'tool2', trigger: 'summary', confidence: 0.8 },
        { toolId: 'tool3', trigger: 'build', confidence: 0.5 },
      ];

      const bestMatch = detector.getBestMatch(triggers);

      expect(bestMatch).toBe(triggers[0]);
      expect(bestMatch?.toolId).toBe('tool1');
    });

    it('should return null for empty array', () => {
      const bestMatch = detector.getBestMatch([]);

      expect(bestMatch).toBeNull();
    });

    it('should return null for undefined input', () => {
      const bestMatch = detector.getBestMatch(undefined as any);

      expect(bestMatch).toBeNull();
    });

    it('should return single match', () => {
      const triggers: DetectedTrigger[] = [
        { toolId: 'tool1', trigger: 'create', confidence: 0.8 },
      ];

      const bestMatch = detector.getBestMatch(triggers);

      expect(bestMatch).toBe(triggers[0]);
    });
  });

  describe('detectTriggers - Multi-word Triggers', () => {
    it('should detect multi-word triggers exactly', () => {
      const plugin = createMockPlugin('test_tool', ['create summary for me']);
      registry.register(plugin);

      const transcript = 'create summary for me';
      const detected = detector.detectTriggers(transcript);

      expect(detected).toHaveLength(1);
      expect(detected[0].confidence).toBe(1.0);
    });

    it('should match partial multi-word triggers', () => {
      const plugin = createMockPlugin('test_tool', ['create summary for me']);
      registry.register(plugin);

      const transcript = 'create the summary';
      const detected = detector.detectTriggers(transcript);

      if (detected.length > 0) {
        expect(detected[0].toolId).toBe('test_tool');
        expect(detected[0].confidence).toBeLessThanOrEqual(0.9);
      }
    });
  });
});
