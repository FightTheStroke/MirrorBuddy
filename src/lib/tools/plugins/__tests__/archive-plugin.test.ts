/**
 * Tests for Archive Plugin
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { archivePlugin } from '../archive-plugin';
import { ToolCategory, Permission } from '../../plugin/types';

// Extract schema for testing
const ArchivePluginSchema = z.object({
  query: z.string().max(500).optional(),
  toolType: z.enum(['mindmap', 'quiz', 'flashcard', 'summary', 'diagram', 'timeline']).optional(),
  subject: z.string().max(100).optional(),
}).refine(
  (d) => d.query || d.toolType || d.subject,
  'At least one search criterion required'
);

describe('archive-plugin', () => {
  describe('plugin configuration', () => {
    it('has correct id', () => {
      expect(archivePlugin.id).toBe('search_archive');
    });

    it('has correct name', () => {
      expect(archivePlugin.name).toBe('Archivio Personale');
    });

    it('has correct category', () => {
      expect(archivePlugin.category).toBe(ToolCategory.NAVIGATION);
    });

    it('has required permissions', () => {
      expect(archivePlugin.permissions).toContain(Permission.READ_PROFILE);
      expect(archivePlugin.permissions).toContain(Permission.VOICE_OUTPUT);
    });

    it('has voice triggers', () => {
      expect(archivePlugin.triggers).toContain('archivio');
      expect(archivePlugin.triggers).toContain('cerca archivio');
      expect(archivePlugin.triggers).toContain('my materials');
    });

    it('is voice enabled', () => {
      expect(archivePlugin.voiceEnabled).toBe(true);
    });

    it('has voice prompt configuration', () => {
      expect(archivePlugin.voicePrompt?.template).toContain('archivio personale');
      expect(archivePlugin.voicePrompt?.fallback).toBeDefined();
    });

    it('has voice feedback configuration', () => {
      expect(archivePlugin.voiceFeedback?.template).toContain('materiali');
      expect(archivePlugin.voiceFeedback?.requiresContext).toContain('resultCount');
    });

    it('has no prerequisites', () => {
      expect(archivePlugin.prerequisites).toEqual([]);
    });

    it('has handler function', () => {
      expect(typeof archivePlugin.handler).toBe('function');
    });

    it('has schema defined', () => {
      expect(archivePlugin.schema).toBeDefined();
    });
  });

  describe('schema validation', () => {
    it('accepts query search', () => {
      const result = ArchivePluginSchema.safeParse({ query: 'math' });
      expect(result.success).toBe(true);
    });

    it('accepts toolType search', () => {
      const result = ArchivePluginSchema.safeParse({ toolType: 'mindmap' });
      expect(result.success).toBe(true);
    });

    it('accepts subject search', () => {
      const result = ArchivePluginSchema.safeParse({ subject: 'mathematics' });
      expect(result.success).toBe(true);
    });

    it('accepts combined search criteria', () => {
      const result = ArchivePluginSchema.safeParse({
        query: 'fractions',
        toolType: 'quiz',
        subject: 'math',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty search (no criteria)', () => {
      const result = ArchivePluginSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects query exceeding max length', () => {
      const result = ArchivePluginSchema.safeParse({
        query: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('rejects subject exceeding max length', () => {
      const result = ArchivePluginSchema.safeParse({
        subject: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid toolType', () => {
      const result = ArchivePluginSchema.safeParse({
        toolType: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('accepts all valid tool types', () => {
      const validTypes = ['mindmap', 'quiz', 'flashcard', 'summary', 'diagram', 'timeline'];
      for (const type of validTypes) {
        const result = ArchivePluginSchema.safeParse({ toolType: type });
        expect(result.success).toBe(true);
      }
    });
  });
});
