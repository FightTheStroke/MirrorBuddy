import { describe, it, expect } from 'vitest';
import { computeVoiceTimingDurations } from '../voice-timing';

describe('computeVoiceTimingDurations', () => {
  it('should compute durations when all marks are present', () => {
    const durations = computeVoiceTimingDurations({
      connectStartMs: 1000,
      dataChannelOpenMs: 1300,
      sessionUpdatedMs: 1700,
    });

    expect(durations.connectToDataChannelOpenMs).toBe(300);
    expect(durations.connectToSessionUpdatedMs).toBe(700);
    expect(durations.dataChannelOpenToSessionUpdatedMs).toBe(400);
  });

  it('should return null for durations when marks are missing', () => {
    const durations = computeVoiceTimingDurations({
      connectStartMs: 1000,
      dataChannelOpenMs: null,
      sessionUpdatedMs: 1500,
    });

    expect(durations.connectToDataChannelOpenMs).toBeNull();
    expect(durations.connectToSessionUpdatedMs).toBe(500);
    expect(durations.dataChannelOpenToSessionUpdatedMs).toBeNull();
  });

  it('should not return negative durations', () => {
    const durations = computeVoiceTimingDurations({
      connectStartMs: 2000,
      dataChannelOpenMs: 1500,
      sessionUpdatedMs: 1000,
    });

    expect(durations.connectToDataChannelOpenMs).toBe(0);
    expect(durations.connectToSessionUpdatedMs).toBe(0);
    expect(durations.dataChannelOpenToSessionUpdatedMs).toBe(0);
  });
});
