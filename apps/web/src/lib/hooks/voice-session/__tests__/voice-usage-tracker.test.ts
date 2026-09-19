import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVoiceUsageTracker, MAX_TRACKED_VOICE_RESPONSES } from '../voice-usage-tracker';
import { created, done } from './usage-event-fixture';
vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));
vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));
import { csrfFetch } from '@/lib/auth';
import { clientLogger } from '@/lib/logger/client';
const context = { sessionId: 'voice-tracker', maestroId: 'first-maestro' };
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(csrfFetch).mockImplementation(async () => new Response('{"success":true}'));
});

describe('bounded identity history and metadata snapshots', () => {
  it('retains the creating maestro even when the current context changes', async () => {
    const tracker = createVoiceUsageTracker();
    tracker.accept(created('resp-a'), context);
    tracker.accept(created('resp-b'), { ...context, maestroId: 'second-maestro' });
    expect(tracker.accept(done('resp-a'), { ...context, maestroId: 'second-maestro' })).toBe(false);
    await settled();
    const payload = JSON.parse(String(vi.mocked(csrfFetch).mock.calls[0][1]?.body));
    expect(payload.maestroId).toBe('first-maestro');
    expect(payload.responseId).toBe('resp-a');
  });
  it('bounds acknowledged history and does not rebind an evicted late event', async () => {
    const tracker = createVoiceUsageTracker();
    for (let n = 0; n <= MAX_TRACKED_VOICE_RESPONSES; n++) {
      tracker.accept(created(`resp-${n}`), context);
      tracker.accept(done(`resp-${n}`), context);
      await settled();
    }
    expect(tracker.size).toBe(MAX_TRACKED_VOICE_RESPONSES);
    expect(tracker.accept(done('resp-0'), context)).toBe(false);
    expect(csrfFetch).toHaveBeenCalledTimes(MAX_TRACKED_VOICE_RESPONSES + 1);
    expect(clientLogger.warn).toHaveBeenCalled();
  });
  it('keeps conversation progress and bounds memory even when acknowledgements stall', async () => {
    const grants: ((response: Response) => void)[] = [];
    vi.mocked(csrfFetch).mockImplementation(() => new Promise((resolve) => grants.push(resolve)));
    const tracker = createVoiceUsageTracker();
    for (let n = 0; n <= MAX_TRACKED_VOICE_RESPONSES; n++) {
      expect(tracker.accept(created(`resp-${n}`), context)).toBe(true);
      expect(tracker.accept(done(`resp-${n}`), context)).toBe(true);
    }
    expect(tracker.size).toBe(MAX_TRACKED_VOICE_RESPONSES);
    expect(clientLogger.warn).toHaveBeenCalledWith(
      '[VoiceUsage] Client history limit reached before acknowledgement',
    );
    for (const grant of grants) grant(new Response('{"success":true}'));
    await settled();
  });
  it('uses an independent local history for a new hook lifetime', async () => {
    for (let mount = 0; mount < 2; mount++) {
      const tracker = createVoiceUsageTracker();
      tracker.accept(created('resp-remount'), context);
      tracker.accept(done('resp-remount'), context);
      await settled();
    }
    expect(csrfFetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(csrfFetch).mock.calls[0][1]?.body).toBe(
      vi.mocked(csrfFetch).mock.calls[1][1]?.body,
    );
  });
});
