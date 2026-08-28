/**
 * Request timeline for the streaming chat route
 *
 * MirrorBuddy could measure how long a whole answer took, but not how long the
 * student waited before the first word appeared - and that wait is what people
 * describe when they say the app feels slow. Nor could it say which phase the
 * wait was spent in. Every latency figure was therefore an estimate read off the
 * code rather than a measurement.
 *
 * This records the few marks that answer those two questions, and emits them once
 * per request as a single structured line.
 */

import { logger } from '@/lib/logger';

/** Phases worth telling apart when a request feels slow. */
export type TimelinePhase = 'auth' | 'settings' | 'context' | 'safety' | 'firstToken';

/**
 * Marks the points of a single streaming request and reports them once.
 */
export class RequestTimeline {
  private readonly startedAt: number;
  private readonly marks = new Map<TimelinePhase, number>();
  private reported = false;

  constructor(now: number = Date.now()) {
    this.startedAt = now;
  }

  /** Record that a phase has just finished. */
  mark(phase: TimelinePhase, now: number = Date.now()): void {
    this.marks.set(phase, now - this.startedAt);
  }

  /** Milliseconds from the start of the request to the given phase. */
  elapsed(phase: TimelinePhase): number | undefined {
    return this.marks.get(phase);
  }

  /**
   * Emit the timeline once, when the student sees the first word.
   *
   * Repeated calls are ignored: the first token happens once per request, but the
   * stream loop that detects it runs per chunk.
   */
  reportFirstToken(context: Record<string, unknown> = {}, now: number = Date.now()): void {
    if (this.reported) {
      return;
    }
    this.reported = true;
    this.mark('firstToken', now);

    logger.info('Chat stream timing', {
      ...context,
      timeToFirstTokenMs: this.marks.get('firstToken'),
      authMs: this.marks.get('auth'),
      settingsMs: this.marks.get('settings'),
      contextMs: this.marks.get('context'),
      safetyMs: this.marks.get('safety'),
    });
  }
}
