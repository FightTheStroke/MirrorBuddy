// ============================================================================
// TIMELINE HANDLER TESTS
// Comprehensive unit tests for timeline creation
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ToolExecutionResult } from '@/types/tools';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-timeline-id-123'),
}));

// Mock the tool executor module
vi.mock('../../tool-executor', () => ({
  registerToolHandler: vi.fn((name: string, handler: any) => {
    (globalThis as any).__timelineHandler = handler;
  }),
}));

// Import after mocks
import { validateEvents } from '../timeline-handler';
import '../timeline-handler';

function getTimelineHandler(): ((args: Record<string, unknown>) => Promise<ToolExecutionResult>) | null {
  return (globalThis as any).__timelineHandler ?? null;
}

function requireTimelineHandler(): (args: Record<string, unknown>) => Promise<ToolExecutionResult> {
  const handler = getTimelineHandler();
  if (!handler) throw new Error('Handler not registered');
  return handler;
}

describe('Timeline Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateEvents', () => {
    it('should validate events with date and title', () => {
      const events = [
        { date: '1492', title: 'Discovery of America' },
        { date: '1776', title: 'US Independence' },
      ];
      const result = validateEvents(events);
      expect(result.valid).toBe(true);
    });

    it('should validate events with optional description', () => {
      const events = [
        { date: '1969', title: 'Moon Landing', description: 'Apollo 11' },
      ];
      const result = validateEvents(events);
      expect(result.valid).toBe(true);
    });

    it('should reject empty events array', () => {
      const result = validateEvents([]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('At least one event is required');
    });

    it('should reject null events array', () => {
      const result = validateEvents(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('At least one event is required');
    });

    it('should reject undefined events array', () => {
      const result = validateEvents(undefined as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('At least one event is required');
    });

    it('should reject event without date', () => {
      const events = [{ title: 'Event without date' }];
      const result = validateEvents(events);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Event 1: date is required');
    });

    it('should reject event with non-string date', () => {
      const events = [{ date: 1492, title: 'Discovery' }];
      const result = validateEvents(events);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Event 1: date is required');
    });

    it('should reject event without title', () => {
      const events = [{ date: '1492' }];
      const result = validateEvents(events);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Event 1: title is required');
    });

    it('should reject event with non-string title', () => {
      const events = [{ date: '1492', title: 123 }];
      const result = validateEvents(events);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Event 1: title is required');
    });

    it('should report correct event number for second event error', () => {
      const events = [
        { date: '1492', title: 'Valid' },
        { date: '1776' }, // missing title
      ];
      const result = validateEvents(events);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Event 2: title is required');
    });
  });

  describe('Timeline Handler Registration', () => {
    it('should have a registered handler', () => {
      expect(getTimelineHandler()).not.toBeNull();
      expect(typeof getTimelineHandler()).toBe('function');
    });
  });

  describe('Timeline Creation', () => {
    it('should create a valid timeline', async () => {
      const args = {
        topic: 'Roman History',
        period: '753 a.C. - 476 d.C.',
        events: [
          { date: '753 a.C.', title: 'Foundation of Rome' },
          { date: '509 a.C.', title: 'Roman Republic' },
          { date: '27 a.C.', title: 'Roman Empire' },
        ],
      };

      const result = await requireTimelineHandler()(args);

      expect(result.success).toBe(true);
      expect(result.toolId).toBe('test-timeline-id-123');
      expect(result.toolType).toBe('timeline');

      const data = result.data as any;
      expect(data.topic).toBe('Roman History');
      expect(data.period).toBe('753 a.C. - 476 d.C.');
      expect(data.events).toHaveLength(3);
    });

    it('should create timeline without period', async () => {
      const args = {
        topic: 'Key Events',
        events: [
          { date: '2000', title: 'Event A' },
          { date: '2010', title: 'Event B' },
        ],
      };

      const result = await requireTimelineHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.period).toBeUndefined();
    });

    it('should sort events chronologically', async () => {
      const args = {
        topic: 'Test Sorting',
        events: [
          { date: '2020', title: 'Third' },
          { date: '2010', title: 'Second' },
          { date: '2000', title: 'First' },
        ],
      };

      const result = await requireTimelineHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.events[0].title).toBe('First');
      expect(data.events[1].title).toBe('Second');
      expect(data.events[2].title).toBe('Third');
    });

    it('should sort BCE dates correctly', async () => {
      const args = {
        topic: 'Ancient History',
        events: [
          { date: '476 d.C.', title: 'Fall of Rome' },
          { date: '753 a.C.', title: 'Rome Founded' },
          { date: '509 a.C.', title: 'Republic' },
        ],
      };

      const result = await requireTimelineHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      // BCE dates should come first, larger BCE year is earlier
      expect(data.events[0].title).toBe('Rome Founded');
      expect(data.events[1].title).toBe('Republic');
      expect(data.events[2].title).toBe('Fall of Rome');
    });

    it('should trim whitespace from all fields', async () => {
      const args = {
        topic: '  My Timeline  ',
        period: '  2000-2020  ',
        events: [
          { date: '  2010  ', title: '  Event  ', description: '  Description  ' },
        ],
      };

      const result = await requireTimelineHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.topic).toBe('My Timeline');
      expect(data.period).toBe('2000-2020');
      expect(data.events[0].date).toBe('2010');
      expect(data.events[0].title).toBe('Event');
      expect(data.events[0].description).toBe('Description');
    });

    it('should handle events with descriptions', async () => {
      const args = {
        topic: 'Test',
        events: [
          { date: '1969', title: 'Moon Landing', description: 'Apollo 11 mission' },
        ],
      };

      const result = await requireTimelineHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.events[0].description).toBe('Apollo 11 mission');
    });
  });

  describe('Timeline Validation Errors', () => {
    it('should return error for missing topic', async () => {
      const args = {
        events: [{ date: '2020', title: 'Event' }],
      };

      const result = await requireTimelineHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Topic is required and must be a string');
    });

    it('should return error for non-string topic', async () => {
      const args = {
        topic: 123,
        events: [{ date: '2020', title: 'Event' }],
      };

      const result = await requireTimelineHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Topic is required and must be a string');
    });

    it('should return error for empty events', async () => {
      const args = {
        topic: 'Test',
        events: [],
      };

      const result = await requireTimelineHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toBe('At least one event is required');
    });

    it('should return error for invalid event structure', async () => {
      const args = {
        topic: 'Test',
        events: [{ date: '2020' }], // missing title
      };

      const result = await requireTimelineHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Event 1: title is required');
    });
  });

  describe('Edge Cases', () => {
    it('should handle many events', async () => {
      const events = Array.from({ length: 20 }, (_, i) => ({
        date: `${2000 + i}`,
        title: `Event ${i + 1}`,
      }));

      const args = { topic: 'Large Timeline', events };
      const result = await requireTimelineHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.events).toHaveLength(20);
    });

    it('should handle special characters in text', async () => {
      const args = {
        topic: 'Test & "Quotes" <HTML>',
        events: [
          { date: '2020', title: 'Event with "quotes" & <tags>' },
        ],
      };

      const result = await requireTimelineHandler()(args);

      expect(result.success).toBe(true);
    });

    it('should handle unicode in text', async () => {
      const args = {
        topic: 'Storia d\'Italia 🇮🇹',
        events: [
          { date: '1861', title: 'Unità d\'Italia' },
        ],
      };

      const result = await requireTimelineHandler()(args);

      expect(result.success).toBe(true);
    });

    it('should handle undefined description gracefully', async () => {
      const args = {
        topic: 'Test',
        events: [
          { date: '2020', title: 'Event', description: undefined },
        ],
      };

      const result = await requireTimelineHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.events[0].description).toBeUndefined();
    });
  });
});
