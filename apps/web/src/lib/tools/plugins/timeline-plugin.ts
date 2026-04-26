/**
 * Timeline Plugin
 * Creates interactive timelines for historical events and chronological sequences
 * Supports sorting and visualization of events
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
import type { ToolContext, ToolResult } from '@/types/tools';
import { validateEvents } from '../handlers/timeline-handler';

/**
 * Zod schema for timeline plugin input validation
 */
const TimelinePluginSchema = z.object({
  topic: z
    .string()
    .min(1, 'Topic is required')
    .max(200, 'Topic must be under 200 characters'),
  period: z.string().max(100, 'Period must be under 100 characters').optional(),
  events: z
    .array(
      z.object({
        date: z.string().min(1, 'Date is required'),
        title: z.string().min(1, 'Title is required'),
        description: z.string().optional(),
      })
    )
    .min(1, 'At least one event is required')
    .max(100, 'Maximum 100 events'),
});

/**
 * Timeline plugin handler
 * Validates events and creates timeline structure
 */
async function handleTimelinePlugin(
  args: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> {
  try {
    const validated = TimelinePluginSchema.parse(args);
    const { topic, period, events } = validated;

    // Validate events structure using existing handler logic
    const validation = validateEvents(events);
    if (!validation.valid) {
      return createErrorResult(
        'create_timeline',
        ToolErrorCode.VALIDATION_FAILED,
        validation.error || 'Invalid events structure'
      );
    }

    // Normalize events
    const normalizedEvents = events.map((e) => ({
      date: e.date.trim(),
      title: e.title.trim(),
      description: e.description?.trim(),
    }));

    // Return timeline data structure
    return createSuccessResult('create_timeline', {
      topic: topic.trim(),
      period: period?.trim(),
      events: normalizedEvents,
      eventCount: normalizedEvents.length,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResult(
        'create_timeline',
        ToolErrorCode.VALIDATION_FAILED,
        `Validation error: ${error.issues[0].message}`,
        { validationErrors: error.issues }
      );
    }

    return createErrorResult(
      'create_timeline',
      ToolErrorCode.EXECUTION_FAILED,
      error instanceof Error ? error.message : 'Timeline creation failed'
    );
  }
}

/**
 * Timeline Plugin Definition
 * Enables creation of chronological timelines for learning
 * Fulfills F-02 (Maestri can create tools) and F-03 (Tools integrate with system)
 */
export const timelinePlugin: ToolPlugin = {
  // Identification
  id: 'create_timeline',
  name: 'Timeline',

  // Organization
  category: ToolCategory.CREATION,

  // Validation
  schema: TimelinePluginSchema,

  // Execution
  handler: handleTimelinePlugin,

  // Voice interaction
  voicePrompt: {
    template: 'Vuoi creare una timeline su {topic}?',
    requiresContext: ['topic'],
    fallback: 'Vuoi creare una timeline?',
  },
  voiceFeedback: {
    template: 'Ho creato una timeline con {eventCount} eventi!',
    requiresContext: ['eventCount'],
    fallback: 'Timeline creata con successo!',
  },
  voiceEnabled: true,

  // Voice triggers - Italian and English variations
  triggers: [
    'timeline',
    'crea timeline',
    'cronologia',
    'storia',
    'sequenza temporale',
    'asse temporale',
    'chronology',
  ],

  // Prerequisites
  prerequisites: [],

  // Permissions
  permissions: [Permission.WRITE_CONTENT, Permission.VOICE_OUTPUT],
};

export default timelinePlugin;
