// ============================================================================
// CHART HANDLER
// Generates Chart.js configurations for data visualization
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { nanoid } from 'nanoid';
import type { ChartData, ToolExecutionResult } from '@/types/tools';

const VALID_CHART_TYPES = [
  'line',
  'bar',
  'pie',
  'doughnut',
  'scatter',
  'radar',
  'polarArea',
] as const;

type ValidChartType = (typeof VALID_CHART_TYPES)[number];

/**
 * Validate chart type
 */
function validateChartType(
  chartType: string
): { valid: boolean; error?: string } {
  if (!chartType || typeof chartType !== 'string') {
    return { valid: false, error: 'Chart type is required' };
  }

  if (!VALID_CHART_TYPES.includes(chartType as ValidChartType)) {
    return {
      valid: false,
      error: `Invalid chart type. Must be one of: ${VALID_CHART_TYPES.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate chart data structure
 */
function validateChartData(data: {
  labels?: string[];
  datasets?: Array<{ label: string; data: number[] }>;
}): { valid: boolean; error?: string } {
  if (!data.labels || !Array.isArray(data.labels)) {
    return { valid: false, error: 'Chart labels are required' };
  }

  if (!data.datasets || !Array.isArray(data.datasets)) {
    return { valid: false, error: 'Chart datasets are required' };
  }

  if (data.datasets.length === 0) {
    return { valid: false, error: 'At least one dataset is required' };
  }

  // Validate each dataset
  for (let i = 0; i < data.datasets.length; i++) {
    const dataset = data.datasets[i];

    if (!dataset.label || typeof dataset.label !== 'string') {
      return {
        valid: false,
        error: `Dataset ${i + 1}: label is required`,
      };
    }

    if (!Array.isArray(dataset.data)) {
      return {
        valid: false,
        error: `Dataset ${i + 1}: data must be an array`,
      };
    }

    if (dataset.data.length === 0) {
      return {
        valid: false,
        error: `Dataset ${i + 1}: data array is empty`,
      };
    }

    // Check data length matches labels
    if (dataset.data.length !== data.labels.length) {
      return {
        valid: false,
        error: `Dataset ${i + 1}: data length (${dataset.data.length}) does not match labels length (${data.labels.length})`,
      };
    }
  }

  return { valid: true };
}

/**
 * Generate Chart.js configuration
 */
function generateChartConfig(
  chartType: ValidChartType,
  title: string,
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
    }>;
  }
): Record<string, unknown> {
  const colorPalette = [
    'rgba(59, 130, 246, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(249, 115, 22, 0.7)',
    'rgba(239, 68, 68, 0.7)', 'rgba(168, 85, 247, 0.7)', 'rgba(236, 72, 153, 0.7)', 'rgba(234, 179, 8, 0.7)',
  ];
  const borderColors = colorPalette.map((c) => c.replace('0.7', '1'));

  const datasetsWithColors = data.datasets.map((dataset, index) => {
    const baseColor = colorPalette[index % colorPalette.length];
    const borderColor = borderColors[index % borderColors.length];
    if (chartType === 'pie' || chartType === 'doughnut') {
      return { ...dataset, backgroundColor: dataset.backgroundColor || colorPalette,
        borderColor: dataset.borderColor || borderColors, borderWidth: 2 };
    }
    return { ...dataset, backgroundColor: dataset.backgroundColor || baseColor,
      borderColor: dataset.borderColor || borderColor, borderWidth: 2,
      tension: chartType === 'line' ? 0.3 : undefined };
  });

  const config: Record<string, unknown> = {
    type: chartType,
    data: { labels: data.labels, datasets: datasetsWithColors },
    options: {
      responsive: true, maintainAspectRatio: true, aspectRatio: 2,
      plugins: {
        title: { display: true, text: title, font: { size: 16, weight: 'bold' } },
        legend: { display: true, position: 'top' },
      },
    },
  };

  if (chartType === 'line' || chartType === 'bar' || chartType === 'scatter') {
    (config.options as Record<string, unknown>).scales = {
      y: { beginAtZero: true, ticks: { font: { size: 12 } } },
      x: { ticks: { font: { size: 12 } } },
    };
  }

  if (chartType === 'radar') {
    (config.options as Record<string, unknown>).scales = {
      r: { beginAtZero: true, ticks: { font: { size: 12 } } },
    };
  }

  return config;
}

/**
 * Register the chart handler
 */
registerToolHandler('create_chart', async (args): Promise<ToolExecutionResult> => {
  const { title, chartType, labels, datasets, description, dataSource } = args as {
    title: string;
    chartType: ValidChartType;
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
    }>;
    description?: string;
    dataSource?: string;
  };

  // Validate title
  if (!title || typeof title !== 'string') {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'chart',
      error: 'Title is required and must be a string',
    };
  }

  // Validate chart type
  const typeValidation = validateChartType(chartType);
  if (!typeValidation.valid) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'chart',
      error: typeValidation.error,
    };
  }

  // Validate chart data
  const dataValidation = validateChartData({ labels, datasets });
  if (!dataValidation.valid) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'chart',
      error: dataValidation.error,
    };
  }

  // Generate Chart.js config
  const config = generateChartConfig(chartType, title, { labels, datasets });

  const data: ChartData = {
    title: title.trim(),
    chartType,
    config,
    description: description?.trim(),
    dataSource: dataSource?.trim(),
  };

  return {
    success: true,
    toolId: nanoid(),
    toolType: 'chart',
    data,
  };
});

export { validateChartType, validateChartData, generateChartConfig };
