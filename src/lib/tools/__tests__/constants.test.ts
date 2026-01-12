// ============================================================================
// TOOL CONSTANTS TESTS
// Unit tests for tool configuration helpers
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  TOOL_CONFIG,
  TOOL_CATEGORIES,
  getToolByFunctionName,
  getToolByType,
  getToolRoute,
  getToolsByCategory,
  toolRequiresMaestro,
  functionNameToToolType,
  type ToolConfig,
} from '../constants';

describe('Tool Constants', () => {
  describe('TOOL_CONFIG', () => {
    it('should export a non-empty tool config object', () => {
      expect(TOOL_CONFIG).toBeDefined();
      expect(Object.keys(TOOL_CONFIG).length).toBeGreaterThan(0);
    });

    it('should have valid structure for each tool', () => {
      Object.entries(TOOL_CONFIG).forEach(([key, config]) => {
        expect(config.type).toBeDefined();
        expect(config.functionName).toBeDefined();
        expect(config.route).toBeDefined();
        expect(config.category).toBeDefined();
      });
    });
  });

  describe('TOOL_CATEGORIES', () => {
    it('should have upload, create, and search categories', () => {
      const categories = TOOL_CATEGORIES.map(c => c.category);

      expect(categories).toContain('upload');
      expect(categories).toContain('create');
      expect(categories).toContain('search');
    });

    it('should have valid category structure', () => {
      TOOL_CATEGORIES.forEach(category => {
        expect(category.id).toBeDefined();
        expect(category.title).toBeDefined();
        expect(category.subtitle).toBeDefined();
        expect(category.category).toBeDefined();
      });
    });
  });

  describe('getToolByFunctionName', () => {
    it('should find tool by function name', () => {
      const tools = Object.values(TOOL_CONFIG);
      const firstTool = tools[0];

      const result = getToolByFunctionName(firstTool.functionName);

      expect(result).toBeDefined();
      expect(result?.functionName).toBe(firstTool.functionName);
    });

    it('should return undefined for unknown function name', () => {
      const result = getToolByFunctionName('unknown_function_name');

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const result = getToolByFunctionName('');

      expect(result).toBeUndefined();
    });
  });

  describe('getToolByType', () => {
    it('should find tool by type', () => {
      const toolTypes = Object.keys(TOOL_CONFIG);
      const firstType = toolTypes[0];

      const result = getToolByType(firstType as Parameters<typeof getToolByType>[0]);

      expect(result).toBeDefined();
      expect(result?.type).toBe(firstType);
    });

    it('should return undefined for unknown type', () => {
      const result = getToolByType('unknown_type' as Parameters<typeof getToolByType>[0]);

      expect(result).toBeUndefined();
    });
  });

  describe('getToolRoute', () => {
    it('should return route for existing tool type', () => {
      const toolTypes = Object.keys(TOOL_CONFIG);
      const firstType = toolTypes[0] as Parameters<typeof getToolRoute>[0];

      const result = getToolRoute(firstType);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.startsWith('/')).toBe(true);
    });

    it('should return "/" for unknown tool type', () => {
      const result = getToolRoute('unknown_type' as Parameters<typeof getToolRoute>[0]);

      expect(result).toBe('/');
    });
  });

  describe('getToolsByCategory', () => {
    it('should return tools for upload category', () => {
      const result = getToolsByCategory('upload');

      expect(result).toBeInstanceOf(Array);
      result.forEach(tool => {
        expect(tool.category).toBe('upload');
      });
    });

    it('should return tools for create category', () => {
      const result = getToolsByCategory('create');

      expect(result).toBeInstanceOf(Array);
      result.forEach(tool => {
        expect(tool.category).toBe('create');
      });
    });

    it('should return tools for search category', () => {
      const result = getToolsByCategory('search');

      expect(result).toBeInstanceOf(Array);
      result.forEach(tool => {
        expect(tool.category).toBe('search');
      });
    });

    it('should return empty array for unknown category', () => {
      const result = getToolsByCategory('unknown' as ToolConfig['category']);

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(0);
    });
  });

  describe('toolRequiresMaestro', () => {
    it('should return boolean for existing tool type', () => {
      const toolTypes = Object.keys(TOOL_CONFIG);
      const firstType = toolTypes[0] as Parameters<typeof toolRequiresMaestro>[0];

      const result = toolRequiresMaestro(firstType);

      expect(typeof result).toBe('boolean');
    });

    it('should return true for unknown tool type (default)', () => {
      const result = toolRequiresMaestro('unknown_type' as Parameters<typeof toolRequiresMaestro>[0]);

      expect(result).toBe(true);
    });
  });

  describe('functionNameToToolType', () => {
    it('should map function name to tool type', () => {
      const tools = Object.values(TOOL_CONFIG);
      const firstTool = tools[0];

      const result = functionNameToToolType(firstTool.functionName);

      expect(result).toBe(firstTool.type);
    });

    it('should handle legacy open_student_summary function', () => {
      const result = functionNameToToolType('open_student_summary');

      expect(result).toBe('summary');
    });

    it('should return undefined for unknown function name', () => {
      const result = functionNameToToolType('completely_unknown_function');

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const result = functionNameToToolType('');

      expect(result).toBeUndefined();
    });
  });
});
