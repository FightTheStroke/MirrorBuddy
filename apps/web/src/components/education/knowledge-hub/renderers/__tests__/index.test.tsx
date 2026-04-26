/**
 * Unit tests for Knowledge Hub Renderer Registry
 * Tests: registry functions, lazy imports, fallback renderer
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  getRendererImport,
  hasRenderer,
  getSupportedRenderers,
  FallbackRenderer,
  RENDERER_LABELS,
  RENDERER_ICONS,
} from '../index';
import type { ToolType } from '@/types/tools';

describe('Renderer Registry', () => {
  describe('hasRenderer', () => {
    it('returns true for mindmap', () => {
      expect(hasRenderer('mindmap')).toBe(true);
    });

    it('returns true for quiz', () => {
      expect(hasRenderer('quiz')).toBe(true);
    });

    it('returns true for flashcard', () => {
      expect(hasRenderer('flashcard')).toBe(true);
    });

    it('returns true for summary', () => {
      expect(hasRenderer('summary')).toBe(true);
    });

    it('returns true for demo', () => {
      expect(hasRenderer('demo')).toBe(true);
    });

    it('returns true for diagram', () => {
      expect(hasRenderer('diagram')).toBe(true);
    });

    it('returns true for timeline', () => {
      expect(hasRenderer('timeline')).toBe(true);
    });

    it('returns true for formula', () => {
      expect(hasRenderer('formula')).toBe(true);
    });

    it('returns true for chart', () => {
      expect(hasRenderer('chart')).toBe(true);
    });

    it('returns true for pdf', () => {
      expect(hasRenderer('pdf')).toBe(true);
    });

    it('returns true for webcam (image)', () => {
      expect(hasRenderer('webcam')).toBe(true);
    });

    it('returns true for homework', () => {
      expect(hasRenderer('homework')).toBe(true);
    });

    it('returns false for search (no renderer)', () => {
      expect(hasRenderer('search')).toBe(false);
    });
  });

  describe('getSupportedRenderers', () => {
    it('returns array of 12 supported types', () => {
      const supported = getSupportedRenderers();
      expect(supported).toHaveLength(12);
    });

    it('includes all expected renderer types', () => {
      const supported = getSupportedRenderers();
      expect(supported).toContain('mindmap');
      expect(supported).toContain('quiz');
      expect(supported).toContain('flashcard');
      expect(supported).toContain('summary');
      expect(supported).toContain('demo');
      expect(supported).toContain('diagram');
      expect(supported).toContain('timeline');
      expect(supported).toContain('formula');
      expect(supported).toContain('chart');
      expect(supported).toContain('pdf');
      expect(supported).toContain('webcam');
      expect(supported).toContain('homework');
    });

    it('does not include search', () => {
      const supported = getSupportedRenderers();
      expect(supported).not.toContain('search');
    });
  });

  describe('getRendererImport', () => {
    it('returns import function for mindmap', () => {
      const importFn = getRendererImport('mindmap');
      expect(importFn).toBeDefined();
      expect(typeof importFn).toBe('function');
    });

    it('returns import function for quiz', () => {
      const importFn = getRendererImport('quiz');
      expect(importFn).toBeDefined();
      expect(typeof importFn).toBe('function');
    });

    it('returns null for search (unsupported)', () => {
      const importFn = getRendererImport('search');
      expect(importFn).toBeNull();
    });

    it('import function returns promise', async () => {
      const importFn = getRendererImport('mindmap');
      expect(importFn).not.toBeNull();

      const result = importFn!();
      expect(result).toBeInstanceOf(Promise);
    });

    it('lazy import resolves to component with default export', async () => {
      const importFn = getRendererImport('mindmap');
      expect(importFn).not.toBeNull();

      const imported = await importFn!();
      expect(imported).toHaveProperty('default');
      expect(typeof imported.default).toBe('function');
    });
  });

  describe('FallbackRenderer', () => {
    it('renders JSON data', () => {
      const testData = { title: 'Test', content: 'Hello' };
      render(<FallbackRenderer data={testData} />);

      expect(screen.getByText(/"title": "Test"/)).toBeInTheDocument();
      expect(screen.getByText(/"content": "Hello"/)).toBeInTheDocument();
    });

    it('applies className', () => {
      const { container } = render(
        <FallbackRenderer data={{}} className="test-class" />
      );

      expect(container.firstChild).toHaveClass('test-class');
    });

    it('handles empty data', () => {
      render(<FallbackRenderer data={{}} />);
      expect(screen.getByText('{}')).toBeInTheDocument();
    });

    it('handles nested data', () => {
      const nestedData = {
        outer: { inner: { deep: 'value' } },
      };
      render(<FallbackRenderer data={nestedData} />);
      expect(screen.getByText(/"deep": "value"/)).toBeInTheDocument();
    });
  });

  describe('RENDERER_LABELS', () => {
    it('has labels for all 13 tool types', () => {
      const toolTypes: ToolType[] = [
        'mindmap', 'quiz', 'flashcard', 'summary', 'demo',
        'diagram', 'timeline', 'formula', 'chart', 'pdf',
        'webcam', 'homework', 'search',
      ];

      toolTypes.forEach((type) => {
        expect(RENDERER_LABELS[type]).toBeDefined();
        expect(typeof RENDERER_LABELS[type]).toBe('string');
        expect(RENDERER_LABELS[type].length).toBeGreaterThan(0);
      });
    });

    it('labels are in Italian', () => {
      expect(RENDERER_LABELS.mindmap).toBe('Mappa Mentale');
      expect(RENDERER_LABELS.quiz).toBe('Quiz');
      expect(RENDERER_LABELS.flashcard).toBe('Flashcard');
      expect(RENDERER_LABELS.summary).toBe('Riassunto');
    });
  });

  describe('RENDERER_ICONS', () => {
    it('has icons for all 13 tool types', () => {
      const toolTypes: ToolType[] = [
        'mindmap', 'quiz', 'flashcard', 'summary', 'demo',
        'diagram', 'timeline', 'formula', 'chart', 'pdf',
        'webcam', 'homework', 'search',
      ];

      toolTypes.forEach((type) => {
        expect(RENDERER_ICONS[type]).toBeDefined();
        expect(typeof RENDERER_ICONS[type]).toBe('string');
      });
    });

    it('icons are valid Lucide icon names', () => {
      expect(RENDERER_ICONS.mindmap).toBe('brain');
      expect(RENDERER_ICONS.quiz).toBe('help-circle');
      expect(RENDERER_ICONS.chart).toBe('bar-chart-2');
    });
  });
});
