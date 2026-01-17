/**
 * Tests for Demo Plugin
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { demoPlugin } from '../demo-plugin';
import { ToolCategory, Permission, type VoicePromptConfig } from '../../plugin/types';

// Extract schema for testing
const DemoInputSchema = z.object({
  topic: z.string().min(1).max(200),
  type: z.enum(['simulation', 'visualization', 'experiment']).optional().default('visualization'),
  title: z.string().min(1).max(100).optional(),
  concept: z.string().min(1).max(500).optional(),
  visualization: z.string().min(1).max(500).optional(),
  interaction: z.string().min(1).max(500).optional(),
  wowFactor: z.string().max(200).optional(),
});

describe('demo-plugin', () => {
  describe('plugin configuration', () => {
    it('has correct id', () => {
      expect(demoPlugin.id).toBe('create_demo');
    });

    it('has correct name', () => {
      expect(demoPlugin.name).toBe('Demo Interattiva');
    });

    it('has correct category', () => {
      expect(demoPlugin.category).toBe(ToolCategory.EDUCATIONAL);
    });

    it('has required permissions', () => {
      expect(demoPlugin.permissions).toContain(Permission.WRITE_CONTENT);
      expect(demoPlugin.permissions).toContain(Permission.VOICE_OUTPUT);
    });

    it('has voice triggers', () => {
      expect(demoPlugin.triggers).toContain('demo');
      expect(demoPlugin.triggers).toContain('mostra demo');
      expect(demoPlugin.triggers).toContain('simulazione');
    });

    it('is voice enabled', () => {
      expect(demoPlugin.voiceEnabled).toBe(true);
    });

    it('has voice prompt with topic placeholder', () => {
      const voicePrompt = demoPlugin.voicePrompt as VoicePromptConfig;
      expect(voicePrompt.template).toContain('{topic}');
      expect(voicePrompt.requiresContext).toContain('topic');
    });

    it('has voice feedback configuration', () => {
      const voiceFeedback = demoPlugin.voiceFeedback as VoicePromptConfig;
      expect(voiceFeedback.template).toContain('{topic}');
      expect(voiceFeedback.fallback).toBeDefined();
    });

    it('has no prerequisites', () => {
      expect(demoPlugin.prerequisites).toEqual([]);
    });

    it('has handler function', () => {
      expect(typeof demoPlugin.handler).toBe('function');
    });

    it('has schema defined', () => {
      expect(demoPlugin.schema).toBeDefined();
    });
  });

  describe('schema validation', () => {
    it('accepts minimal valid input', () => {
      const result = DemoInputSchema.safeParse({
        topic: 'Physics gravity',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('visualization'); // default
      }
    });

    it('accepts full input', () => {
      const result = DemoInputSchema.safeParse({
        topic: 'Photosynthesis',
        type: 'simulation',
        title: 'Plant Energy',
        concept: 'How plants make food',
        visualization: 'Animated cells',
        interaction: 'Click leaves',
        wowFactor: 'Glowing particles',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty topic', () => {
      const result = DemoInputSchema.safeParse({
        topic: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects topic exceeding max length', () => {
      const result = DemoInputSchema.safeParse({
        topic: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('accepts all valid types', () => {
      const validTypes = ['simulation', 'visualization', 'experiment'];
      for (const type of validTypes) {
        const result = DemoInputSchema.safeParse({ topic: 'Test', type });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid type', () => {
      const result = DemoInputSchema.safeParse({
        topic: 'Test',
        type: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('rejects title exceeding max length', () => {
      const result = DemoInputSchema.safeParse({
        topic: 'Test',
        title: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('rejects concept exceeding max length', () => {
      const result = DemoInputSchema.safeParse({
        topic: 'Test',
        concept: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('rejects wowFactor exceeding max length', () => {
      const result = DemoInputSchema.safeParse({
        topic: 'Test',
        wowFactor: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('applies default type when not provided', () => {
      const result = DemoInputSchema.safeParse({ topic: 'Test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('visualization');
      }
    });
  });

  describe('voice triggers', () => {
    it('includes Italian triggers', () => {
      const italianTriggers = ['demo', 'mostra demo', 'esempio', 'simulazione', 'visualizza', 'interattivo'];
      italianTriggers.forEach((trigger) => {
        expect(demoPlugin.triggers).toContain(trigger);
      });
    });
  });
});
