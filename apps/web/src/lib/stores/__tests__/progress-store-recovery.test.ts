import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProgressStore } from '../progress-store';
import { csrfFetch } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }),
  },
}));
vi.mock('@/lib/notifications/triggers', () => ({
  onStreakMilestone: vi.fn(),
  onAchievement: vi.fn(),
}));

const savedAt = new Date('2026-08-29T12:00:00Z');
const session = {
  id: 'local-session',
  maestroId: 'pythagoras',
  subject: 'math',
  startedAt: savedAt,
  endedAt: savedAt,
  questionsAsked: 1,
  xpEarned: 2,
  mirrorBucksEarned: 2,
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.clearAllMocks();
  useProgressStore.setState(useProgressStore.getInitialState(), true);
  useProgressStore.setState({ lastSyncedAt: savedAt, xp: 12, totalStudyMinutes: 15 });
});
afterEach(() => vi.unstubAllGlobals());

describe('progress hydration recovery', () => {
  it.each([0, 1])('retains dirty data when resource %i fails', async (failedIndex) => {
    useProgressStore.setState({ pendingSync: true, sessionHistory: [session] });
    let requestIndex = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        requestIndex++ === failedIndex
          ? Promise.reject(new TypeError('Load failed'))
          : Promise.resolve(reply(failedIndex === 0 ? [] : { xp: 1 })),
      ),
    );

    await useProgressStore.getState().loadFromServer();

    expect(useProgressStore.getState()).toMatchObject({
      xp: 12,
      sessionHistory: [session],
      pendingSync: true,
      lastSyncedAt: savedAt,
      needsHydration: true,
    });
  });

  it('does not overwrite pending data even when both reads succeed', async () => {
    useProgressStore.setState({ pendingSync: true, sessionHistory: [session] });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(reply({ xp: 1, totalStudyMinutes: 0 }))
        .mockResolvedValueOnce(reply([])),
    );

    await useProgressStore.getState().loadFromServer();

    expect(useProgressStore.getState()).toMatchObject({
      xp: 12,
      totalStudyMinutes: 15,
      sessionHistory: [session],
      pendingSync: true,
      lastSyncedAt: savedAt,
      needsHydration: true,
    });
  });

  it('preserves edits made while responses are in flight', async () => {
    let deliver!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockReturnValueOnce(
          new Promise<Response>((resolve) => {
            deliver = resolve;
          }),
        )
        .mockResolvedValueOnce(reply([])),
    );
    const loading = useProgressStore.getState().loadFromServer();
    useProgressStore.getState().addStudyMinutes(5);
    deliver(reply({ totalStudyMinutes: 1 }));
    await loading;

    expect(useProgressStore.getState()).toMatchObject({
      totalStudyMinutes: 20,
      pendingSync: true,
      lastSyncedAt: savedAt,
    });
  });

  it.each([null, [], 'invalid'])(
    'keeps a failed progress payload recoverable: %j',
    async (body) => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(reply(body))
          .mockResolvedValueOnce(reply([session])),
      );

      await useProgressStore.getState().loadFromServer();

      expect(useProgressStore.getState()).toMatchObject({
        xp: 12,
        lastSyncedAt: savedAt,
        needsHydration: true,
        sessionHistory: [{ ...session, id: 'synced-local-session' }],
      });
    },
  );

  it.each([null, {}, [null]])('does not accept invalid sessions as hydration: %j', async (body) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(reply({ xp: 42 }))
        .mockResolvedValueOnce(reply(body)),
    );
    await useProgressStore.getState().loadFromServer();
    expect(useProgressStore.getState()).toMatchObject({
      xp: 42,
      lastSyncedAt: savedAt,
      needsHydration: true,
      sessionHistory: [],
    });
  });

  it('retains the failed state until a real successful retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(reply({ error: 'unavailable' }, 503))
        .mockResolvedValueOnce(reply([])),
    );
    await useProgressStore.getState().loadFromServer();
    expect(useProgressStore.getState()).toMatchObject({
      xp: 12,
      lastSyncedAt: savedAt,
      needsHydration: true,
    });

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(reply({ xp: 42 }))
        .mockResolvedValueOnce(reply([session])),
    );
    await useProgressStore.getState().loadFromServer();
    expect(useProgressStore.getState()).toMatchObject({
      xp: 42,
      pendingSync: false,
      needsHydration: false,
      sessionHistory: [{ ...session, id: 'synced-local-session' }],
    });
    expect(useProgressStore.getState().lastSyncedAt).not.toEqual(savedAt);
  });

  it('does not acknowledge cancelled reads', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));
    await useProgressStore.getState().loadFromServer(controller.signal);
    expect(useProgressStore.getState()).toMatchObject({
      xp: 12,
      lastSyncedAt: savedAt,
      needsHydration: true,
    });
  });
});

describe('pending progress write acknowledgement', () => {
  it('retains pending data after a non-2xx progress write', async () => {
    useProgressStore.setState({ pendingSync: true });
    vi.mocked(csrfFetch).mockResolvedValue(reply({ error: 'unavailable' }, 500));
    await useProgressStore.getState().syncToServer();
    expect(useProgressStore.getState()).toMatchObject({
      pendingSync: true,
      lastSyncedAt: savedAt,
    });
  });

  it('retains pending data after a non-2xx session write', async () => {
    useProgressStore.setState({ pendingSync: true, sessionHistory: [session] });
    vi.mocked(csrfFetch)
      .mockResolvedValueOnce(reply({}))
      .mockResolvedValueOnce(reply({ error: 'unavailable' }, 500));
    await useProgressStore.getState().syncToServer();
    expect(useProgressStore.getState()).toMatchObject({
      pendingSync: true,
      lastSyncedAt: savedAt,
      sessionHistory: [session],
    });
  });

  it('does not acknowledge changes made after a write started', async () => {
    useProgressStore.setState({ pendingSync: true });
    let deliver!: (response: Response) => void;
    vi.mocked(csrfFetch).mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        deliver = resolve;
      }),
    );
    const saving = useProgressStore.getState().syncToServer();
    useProgressStore.getState().addStudyMinutes(5);
    deliver(reply({}));
    await saving;
    expect(useProgressStore.getState()).toMatchObject({
      totalStudyMinutes: 20,
      pendingSync: true,
      lastSyncedAt: savedAt,
    });

    vi.mocked(csrfFetch).mockResolvedValue(reply({}));
    await useProgressStore.getState().syncToServer();
    expect(useProgressStore.getState().pendingSync).toBe(false);
  });
});
