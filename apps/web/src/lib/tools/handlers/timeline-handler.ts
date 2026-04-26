// ============================================================================
// TIMELINE HANDLER
// Creates interactive timelines for historical events
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { nanoid } from 'nanoid';
import type { TimelineData, TimelineEvent, ToolExecutionResult } from '@/types/tools';

/**
 * Validate timeline events structure
 */
function validateEvents(
  events: unknown[]
): { valid: boolean; error?: string } {
  if (!events || events.length === 0) {
    return { valid: false, error: 'At least one event is required' };
  }

  for (let i = 0; i < events.length; i++) {
    const e = events[i] as Partial<TimelineEvent>;

    if (!e.date || typeof e.date !== 'string') {
      return {
        valid: false,
        error: `Event ${i + 1}: date is required`,
      };
    }

    if (!e.title || typeof e.title !== 'string') {
      return {
        valid: false,
        error: `Event ${i + 1}: title is required`,
      };
    }
  }

  return { valid: true };
}

/**
 * Sort events chronologically (best effort)
 */
function sortEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => {
    // Try to parse dates, fall back to string comparison
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);

    if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
      return dateA.getTime() - dateB.getTime();
    }

    // For historical dates like "753 a.C." or "1492", try extracting year
    const yearA = parseInt(a.date.replace(/\D/g, '')) || 0;
    const yearB = parseInt(b.date.replace(/\D/g, '')) || 0;

    // Handle BCE dates (a.C. in Italian)
    const isAncientA = a.date.toLowerCase().includes('a.c');
    const isAncientB = b.date.toLowerCase().includes('a.c');

    if (isAncientA && !isAncientB) return -1;
    if (!isAncientA && isAncientB) return 1;
    if (isAncientA && isAncientB) return yearB - yearA; // BCE: larger year is earlier

    return yearA - yearB;
  });
}

/**
 * Register the timeline handler
 */
registerToolHandler('create_timeline', async (args): Promise<ToolExecutionResult> => {
  const { topic, period, events } = args as {
    topic: string;
    period?: string;
    events: Array<{
      date: string;
      title: string;
      description?: string;
    }>;
  };

  // Validate topic
  if (!topic || typeof topic !== 'string') {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'timeline',
      error: 'Topic is required and must be a string',
    };
  }

  // Validate events
  const validation = validateEvents(events);
  if (!validation.valid) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'timeline',
      error: validation.error,
    };
  }

  // Normalize and sort events
  const normalizedEvents: TimelineEvent[] = events.map((e) => ({
    date: e.date.trim(),
    title: e.title.trim(),
    description: e.description?.trim(),
  }));

  const sortedEvents = sortEvents(normalizedEvents);

  const data: TimelineData = {
    topic: topic.trim(),
    period: period?.trim(),
    events: sortedEvents,
  };

  return {
    success: true,
    toolId: nanoid(),
    toolType: 'timeline',
    data,
  };
});

export { validateEvents };
