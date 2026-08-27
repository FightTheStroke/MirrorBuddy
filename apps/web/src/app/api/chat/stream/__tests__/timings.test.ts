/**
 * Tests for the streaming chat request timeline
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    child: () => ({
      debug: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const { logger } = await import('@/lib/logger');
const { RequestTimeline } = await import('../timings');

describe('RequestTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('measures each phase from the start of the request', () => {
    const timeline = new RequestTimeline(1000);

    timeline.mark('auth', 1120);
    timeline.mark('context', 1450);

    expect(timeline.elapsed('auth')).toBe(120);
    expect(timeline.elapsed('context')).toBe(450);
  });

  it('reports the wait the student actually feels', () => {
    const timeline = new RequestTimeline(1000);
    timeline.mark('context', 1450);

    timeline.reportFirstToken({ maestroId: 'curie' }, 1800);

    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      'Chat stream timing',
      expect.objectContaining({
        maestroId: 'curie',
        timeToFirstTokenMs: 800,
        contextMs: 450,
      }),
    );
  });

  it('reports once even though the stream loop runs per chunk', () => {
    const timeline = new RequestTimeline(1000);

    timeline.reportFirstToken({}, 1800);
    timeline.reportFirstToken({}, 1900);
    timeline.reportFirstToken({}, 2000);

    expect(vi.mocked(logger.info)).toHaveBeenCalledTimes(1);
  });

  it('keeps the first measurement, not a later one', () => {
    const timeline = new RequestTimeline(1000);

    timeline.reportFirstToken({}, 1800);
    timeline.reportFirstToken({}, 5000);

    expect(timeline.elapsed('firstToken')).toBe(800);
  });

  it('leaves unmeasured phases out rather than reporting a zero', () => {
    const timeline = new RequestTimeline(1000);

    expect(timeline.elapsed('safety')).toBeUndefined();
  });
});
