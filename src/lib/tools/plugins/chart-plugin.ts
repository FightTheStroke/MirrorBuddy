/**
 * Chart Plugin
 * Tool plugin for creating data visualizations (Chart.js)
 * Supports both Italian and English voice triggers for accessibility
 */

import { z } from 'zod';
import {
  ToolPlugin,
  ToolCategory,
  Permission,
  createSuccessResult,
  createErrorResult,
  ToolErrorCode,
} from '../plugin/types';
import type { ToolResult, ChartData, ToolContext } from '@/types/tools';
import {
  validateChartType,
  validateChartData,
  generateChartConfig,
} from '../handlers/chart-handler';
import { logger } from '@/lib/logger';

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
 * Zod schema for chart input validation
 * Validates chart configuration with datasets and labels
 */
const ChartInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be under 200 characters'),
  chartType: z.enum(VALID_CHART_TYPES),
  labels: z.array(z.string()).min(1, 'At least one label is required'),
  datasets: z
    .array(
      z.object({
        label: z.string().min(1, 'Dataset label is required'),
        data: z.array(z.number()).min(1, 'Dataset data is required'),
        backgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
        borderColor: z.union([z.string(), z.array(z.string())]).optional(),
      })
    )
    .min(1, 'At least one dataset is required'),
  description: z.string().optional(),
  dataSource: z.string().optional(),
});

/**
 * Handler for chart creation
 * Generates Chart.js configuration for data visualization
 */
async function chartHandler(
  args: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> {
  try {
    const validated = ChartInputSchema.parse(args);
    const { title, chartType, labels, datasets, description, dataSource } = validated;

    // Validate chart type
    const typeValidation = validateChartType(chartType);
    if (!typeValidation.valid) {
      return createErrorResult(
        'create_chart',
        ToolErrorCode.VALIDATION_FAILED,
        typeValidation.error || 'Invalid chart type'
      );
    }

    // Validate chart data structure
    const dataValidation = validateChartData({ labels, datasets });
    if (!dataValidation.valid) {
      return createErrorResult(
        'create_chart',
        ToolErrorCode.VALIDATION_FAILED,
        dataValidation.error || 'Invalid chart data'
      );
    }

    // Generate Chart.js config
    const config = generateChartConfig(
      chartType as ValidChartType,
      title,
      { labels, datasets }
    );

    const data: ChartData = {
      title: title.trim(),
      chartType,
      config,
      description: description?.trim(),
      dataSource: dataSource?.trim(),
    };

    logger.info('Chart created successfully', {
      chartType,
      datasetCount: datasets.length,
      labelCount: labels.length,
    });

    return createSuccessResult('create_chart', data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResult(
        'create_chart',
        ToolErrorCode.VALIDATION_FAILED,
        `Validation error: ${error.issues[0].message}`,
        { validationErrors: error.issues }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Chart creation failed', { error: errorMessage });

    return createErrorResult(
      'create_chart',
      ToolErrorCode.EXECUTION_FAILED,
      errorMessage
    );
  }
}

/**
 * Chart Plugin Definition
 * Implements ToolPlugin interface for data visualization
 * Supports voice interaction with Italian and English triggers
 */
export const chartPlugin: ToolPlugin = {
  // Identification
  id: 'create_chart',
  name: 'Grafico',

  // Organization
  category: ToolCategory.CREATION,

  // Validation
  schema: ChartInputSchema,

  // Execution
  handler: chartHandler,

  // Voice interaction
  voicePrompt: {
    template: 'Vuoi creare un grafico su {topic}?',
    requiresContext: ['topic'],
    fallback: 'Vuoi creare un grafico?',
  },
  voiceFeedback: {
    template: 'Ecco il grafico con {datasetCount} serie di dati!',
    requiresContext: ['datasetCount'],
    fallback: 'Ho creato il tuo grafico!',
  },
  voiceEnabled: true,

  // Voice triggers - Italian and English variations
  triggers: [
    'grafico',
    'chart',
    'graph',
    'crea grafico',
    'visualizza dati',
    'istogramma',
    'create chart',
    'dati',
    'statistiche',
  ],

  // Prerequisites
  prerequisites: [],

  // Permissions
  permissions: [Permission.WRITE_CONTENT, Permission.VOICE_OUTPUT],
};

export default chartPlugin;
