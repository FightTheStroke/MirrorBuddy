/**
 * Tests for Chart Handler
 */

import { describe, it, expect } from 'vitest';
import {
  validateChartType,
  validateChartData,
  generateChartConfig,
} from '../chart-handler';

describe('chart-handler', () => {
  describe('validateChartType', () => {
    it('accepts valid chart types', () => {
      expect(validateChartType('line')).toEqual({ valid: true });
      expect(validateChartType('bar')).toEqual({ valid: true });
      expect(validateChartType('pie')).toEqual({ valid: true });
      expect(validateChartType('doughnut')).toEqual({ valid: true });
      expect(validateChartType('scatter')).toEqual({ valid: true });
      expect(validateChartType('radar')).toEqual({ valid: true });
      expect(validateChartType('polarArea')).toEqual({ valid: true });
    });

    it('rejects invalid chart types', () => {
      const result = validateChartType('invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid chart type');
    });

    it('rejects empty chart type', () => {
      const result = validateChartType('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Chart type is required');
    });

    it('rejects non-string chart type', () => {
      const result = validateChartType(null as unknown as string);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateChartData', () => {
    it('validates correct data structure', () => {
      const data = {
        labels: ['A', 'B', 'C'],
        datasets: [{ label: 'Dataset 1', data: [1, 2, 3] }],
      };
      expect(validateChartData(data)).toEqual({ valid: true });
    });

    it('rejects missing labels', () => {
      const data = {
        datasets: [{ label: 'Dataset 1', data: [1, 2, 3] }],
      };
      const result = validateChartData(data as Parameters<typeof validateChartData>[0]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('labels are required');
    });

    it('rejects missing datasets', () => {
      const data = {
        labels: ['A', 'B', 'C'],
      };
      const result = validateChartData(data as Parameters<typeof validateChartData>[0]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('datasets are required');
    });

    it('rejects empty datasets array', () => {
      const data = {
        labels: ['A', 'B', 'C'],
        datasets: [],
      };
      const result = validateChartData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('At least one dataset');
    });

    it('rejects dataset without label', () => {
      const data = {
        labels: ['A', 'B', 'C'],
        datasets: [{ data: [1, 2, 3] } as { label: string; data: number[] }],
      };
      const result = validateChartData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('label is required');
    });

    it('rejects dataset without data array', () => {
      const data = {
        labels: ['A', 'B', 'C'],
        datasets: [{ label: 'Test' } as { label: string; data: number[] }],
      };
      const result = validateChartData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('data must be an array');
    });

    it('rejects empty data array', () => {
      const data = {
        labels: ['A', 'B', 'C'],
        datasets: [{ label: 'Test', data: [] }],
      };
      const result = validateChartData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('data array is empty');
    });

    it('rejects mismatched data and labels length', () => {
      const data = {
        labels: ['A', 'B', 'C'],
        datasets: [{ label: 'Test', data: [1, 2] }],
      };
      const result = validateChartData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not match labels length');
    });

    it('validates multiple datasets', () => {
      const data = {
        labels: ['A', 'B'],
        datasets: [
          { label: 'Dataset 1', data: [1, 2] },
          { label: 'Dataset 2', data: [3, 4] },
        ],
      };
      expect(validateChartData(data)).toEqual({ valid: true });
    });
  });

  describe('generateChartConfig', () => {
    const baseData = {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [{ label: 'Sales', data: [10, 20, 30] }],
    };

    it('generates line chart config', () => {
      const config = generateChartConfig('line', 'Test Line', baseData);
      expect(config.type).toBe('line');
      expect(config.data).toBeDefined();
      expect(config.options).toBeDefined();
    });

    it('generates bar chart config', () => {
      const config = generateChartConfig('bar', 'Test Bar', baseData);
      expect(config.type).toBe('bar');
    });

    it('generates pie chart config with color palette', () => {
      const config = generateChartConfig('pie', 'Test Pie', baseData);
      expect(config.type).toBe('pie');
      const datasets = (config.data as { datasets: Array<{ backgroundColor: string[] }> }).datasets;
      expect(Array.isArray(datasets[0].backgroundColor)).toBe(true);
    });

    it('generates doughnut chart config', () => {
      const config = generateChartConfig('doughnut', 'Test Doughnut', baseData);
      expect(config.type).toBe('doughnut');
    });

    it('generates scatter chart config with scales', () => {
      const config = generateChartConfig('scatter', 'Test Scatter', baseData);
      expect(config.type).toBe('scatter');
      expect((config.options as { scales: unknown }).scales).toBeDefined();
    });

    it('generates radar chart config with r scale', () => {
      const config = generateChartConfig('radar', 'Test Radar', baseData);
      expect(config.type).toBe('radar');
      const scales = (config.options as { scales: { r: unknown } }).scales;
      expect(scales.r).toBeDefined();
    });

    it('generates polarArea chart config', () => {
      const config = generateChartConfig('polarArea', 'Test Polar', baseData);
      expect(config.type).toBe('polarArea');
    });

    it('sets title in options', () => {
      const config = generateChartConfig('line', 'My Title', baseData);
      const plugins = (config.options as { plugins: { title: { text: string } } }).plugins;
      expect(plugins.title.text).toBe('My Title');
    });

    it('applies tension for line charts', () => {
      const config = generateChartConfig('line', 'Test', baseData);
      const datasets = (config.data as { datasets: Array<{ tension: number }> }).datasets;
      expect(datasets[0].tension).toBe(0.3);
    });

    it('preserves custom colors when provided', () => {
      const dataWithColors = {
        labels: ['A', 'B'],
        datasets: [{
          label: 'Test',
          data: [1, 2],
          backgroundColor: 'red',
          borderColor: 'blue',
        }],
      };
      const config = generateChartConfig('bar', 'Test', dataWithColors);
      const datasets = (config.data as { datasets: Array<{ backgroundColor: string }> }).datasets;
      expect(datasets[0].backgroundColor).toBe('red');
    });

    it('assigns colors to multiple datasets', () => {
      const multiData = {
        labels: ['A', 'B'],
        datasets: [
          { label: 'D1', data: [1, 2] },
          { label: 'D2', data: [3, 4] },
          { label: 'D3', data: [5, 6] },
        ],
      };
      const config = generateChartConfig('bar', 'Multi', multiData);
      const datasets = (config.data as { datasets: Array<{ backgroundColor: string }> }).datasets;
      expect(datasets[0].backgroundColor).not.toBe(datasets[1].backgroundColor);
    });
  });
});
