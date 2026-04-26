import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ToolRegistry } from '../../plugin/registry';
import { ToolCategory, Permission } from '../../plugin/types';
import { registerAllPlugins } from '../index';
import {
  quizPlugin,
  demoPlugin,
  flashcardPlugin,
  mindmapPlugin,
  summaryPlugin,
  diagramPlugin,
  timelinePlugin,
  searchPlugin,
  archivePlugin,
  pdfPlugin,
  webcamPlugin,
  homeworkPlugin,
  formulaPlugin,
  chartPlugin,
} from '../index';

/**
 * Migration Verification Tests
 * Verifies that all 14 plugins in plugin system are properly configured
 * Tests: F-11 (Thor validates, zero technical debt)
 */
describe('Plugin Migration Verification', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    // Get fresh registry instance
    registry = ToolRegistry.getInstance();
    registry.clear();
  });

  afterEach(() => {
    registry.clear();
  });

  const expectedPlugins = [
    'create_demo',
    'create_quiz',
    'create_flashcard',
    'create_mindmap',
    'create_summary',
    'create_diagram',
    'create_timeline',
    'web_search',
    'search_archive',
    'upload_pdf',
    'capture_webcam',
    'homework_help',
    'create_formula',
    'create_chart',
  ];

  describe('Plugin Registration', () => {
    it('should register all 14 plugins when registerAllPlugins is called', () => {
      registerAllPlugins(registry);
      expect(registry.getAll()).toHaveLength(14);
    });

    it('should register all expected plugin IDs', () => {
      registerAllPlugins(registry);
      const registeredIds = registry.getAll().map(p => p.id);
      expectedPlugins.forEach(id => {
        expect(registeredIds).toContain(id);
      });
    });

    it('should prevent duplicate plugin registration', () => {
      registerAllPlugins(registry);
      expect(() => registerAllPlugins(registry)).toThrow();
    });
  });

  describe('Plugin Properties', () => {
    it('each plugin should have required properties', () => {
      const plugins = [
        demoPlugin,
        quizPlugin,
        flashcardPlugin,
        mindmapPlugin,
        summaryPlugin,
        diagramPlugin,
        timelinePlugin,
        searchPlugin,
        archivePlugin,
        pdfPlugin,
        webcamPlugin,
        homeworkPlugin,
        formulaPlugin,
        chartPlugin,
      ];

      plugins.forEach(plugin => {
        expect(plugin).toHaveProperty('id');
        expect(plugin).toHaveProperty('name');
        expect(plugin).toHaveProperty('handler');
        expect(plugin).toHaveProperty('triggers');
        expect(plugin).toHaveProperty('category');
        expect(plugin).toHaveProperty('schema');
        expect(plugin).toHaveProperty('voicePrompt');
        expect(plugin).toHaveProperty('voiceFeedback');
        expect(plugin).toHaveProperty('permissions');
        expect(plugin).toHaveProperty('prerequisites');

        // Validate non-empty strings
        expect(typeof plugin.id).toBe('string');
        expect(plugin.id.length).toBeGreaterThan(0);
        expect(typeof plugin.name).toBe('string');
        expect(plugin.name.length).toBeGreaterThan(0);

        // Validate arrays
        expect(Array.isArray(plugin.triggers)).toBe(true);
        expect(plugin.triggers.length).toBeGreaterThan(0);
        expect(Array.isArray(plugin.permissions)).toBe(true);
        expect(Array.isArray(plugin.prerequisites)).toBe(true);

        // Validate handler is function
        expect(typeof plugin.handler).toBe('function');
      });
    });

    it('each plugin should have at least one trigger', () => {
      registerAllPlugins(registry);
      registry.getAll().forEach(plugin => {
        expect(plugin.triggers.length).toBeGreaterThan(0);
        plugin.triggers.forEach(trigger => {
          expect(typeof trigger).toBe('string');
          expect(trigger.length).toBeGreaterThan(0);
        });
      });
    });

    it('voice prompts should be valid (string or object)', () => {
      const plugins = [
        demoPlugin,
        quizPlugin,
        flashcardPlugin,
        mindmapPlugin,
        summaryPlugin,
        diagramPlugin,
        timelinePlugin,
        searchPlugin,
        archivePlugin,
        pdfPlugin,
        webcamPlugin,
        homeworkPlugin,
        formulaPlugin,
        chartPlugin,
      ];

      plugins.forEach(plugin => {
        expect(
          typeof plugin.voicePrompt === 'string' ||
          (typeof plugin.voicePrompt === 'object' && plugin.voicePrompt !== null)
        ).toBe(true);

        expect(
          typeof plugin.voiceFeedback === 'string' ||
          (typeof plugin.voiceFeedback === 'object' && plugin.voiceFeedback !== null)
        ).toBe(true);
      });
    });
  });

  describe('Plugin Execution', () => {
    it('each plugin handler should be callable', async () => {
      const plugins = [
        demoPlugin,
        quizPlugin,
        flashcardPlugin,
        mindmapPlugin,
        summaryPlugin,
        diagramPlugin,
        timelinePlugin,
        searchPlugin,
        archivePlugin,
        pdfPlugin,
        webcamPlugin,
        homeworkPlugin,
        formulaPlugin,
        chartPlugin,
      ];

      for (const plugin of plugins) {
        expect(typeof plugin.handler).toBe('function');
        // Verify handler is async (returns Promise)
        const result = plugin.handler({}, {
          sessionId: 'test-session',
          userId: 'test-user',
        });
        expect(result instanceof Promise).toBe(true);
      }
    });
  });

  describe('Registry Querying', () => {
    it('should retrieve plugins by ID', () => {
      registerAllPlugins(registry);
      expectedPlugins.forEach(id => {
        expect(registry.get(id)).toBeDefined();
        expect(registry.has(id)).toBe(true);
      });
    });

    it('should retrieve plugins by trigger', () => {
      registerAllPlugins(registry);
      const demoByTrigger = registry.getByTrigger('demo');
      expect(demoByTrigger.length).toBeGreaterThan(0);
      expect(demoByTrigger[0].id).toBe('create_demo');
    });

    it('should retrieve plugins by category', () => {
      registerAllPlugins(registry);
      const creationTools = registry.getByCategory(ToolCategory.CREATION);
      expect(creationTools.length).toBeGreaterThan(0);
    });

    it('should retrieve plugins by permission', () => {
      registerAllPlugins(registry);
      const withWritePermission = registry.getByPermission(Permission.WRITE_CONTENT);
      expect(withWritePermission.length).toBeGreaterThan(0);
    });
  });

  describe('Schema Validation', () => {
    it('each plugin should have a valid Zod schema', () => {
      const plugins = [
        demoPlugin,
        quizPlugin,
        flashcardPlugin,
        mindmapPlugin,
        summaryPlugin,
        diagramPlugin,
        timelinePlugin,
        searchPlugin,
        archivePlugin,
        pdfPlugin,
        webcamPlugin,
        homeworkPlugin,
        formulaPlugin,
        chartPlugin,
      ];

      plugins.forEach(plugin => {
        // Verify schema has safeParse method (Zod schema indicator)
        expect(typeof plugin.schema.safeParse).toBe('function');
        expect(typeof plugin.schema.parse).toBe('function');
      });
    });
  });
});
