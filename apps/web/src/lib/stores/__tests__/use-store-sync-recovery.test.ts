import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupAutoSync } from '../use-store-sync';
import { useProgressStore } from '../progress-store';
import { csrfFetch, setClientIdentity } from '@/lib/auth';

const { settings } = vi.hoisted(() => ({
  settings: { pendingSync: false, syncToServer: vi.fn(), loadFromServer: vi.fn() },
}));
vi.mock('@/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  csrfFetch: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }),
  },
}));
vi.mock('../settings-store', () => ({ useSettingsStore: { getState: () => settings } }));
vi.mock('../conversation-store', () => ({
  useConversationStore: { getState: () => ({ loadFromServer: vi.fn() }) },
}));
vi.mock('../learnings-store', () => ({
  useLearningsStore: { getState: () => ({ loadFromServer: vi.fn() }) },
}));
vi.mock('@/lib/accessibility', () => ({
  useAccessibilityStore: { getState: () => ({ loadFromDatabase: vi.fn() }) },
}));
vi.mock('@/lib/notifications/triggers', () => ({
  onStreakMilestone: vi.fn(),
  onAchievement: vi.fn(),
}));
const reply = (body: unknown) => new Response(JSON.stringify(body));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  setClientIdentity({
    status: 'authenticated',
    userId: 'test-user',
    role: 'USER',
    legacyOrigin: false,
    needsLegacyUpgrade: false,
  });
  useProgressStore.setState(useProgressStore.getInitialState(), true);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setClientIdentity({ status: 'pending' });
});

describe('automatic recovery of failed progress hydration', () => {
  it('retries both reads without a rerender or pending writes, then stops retrying', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockResolvedValueOnce(reply({ xp: 24 }))
      .mockResolvedValueOnce(reply([]));
    vi.stubGlobal('fetch', fetchMock);
    await useProgressStore.getState().loadFromServer();
    setupAutoSync();

    await vi.advanceTimersByTimeAsync(30000);
    expect(useProgressStore.getState().xp).toBe(24);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(csrfFetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does not retry reads after signing out', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Load failed'));
    vi.stubGlobal('fetch', fetchMock);
    await useProgressStore.getState().loadFromServer();
    setClientIdentity({ status: 'anonymous' });
    setupAutoSync();
    await vi.advanceTimersByTimeAsync(30000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not start hydration if identity changes while a write is awaited', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Load failed'));
    vi.stubGlobal('fetch', fetchMock);
    await useProgressStore.getState().loadFromServer();
    useProgressStore.getState().addStudyMinutes(1);
    let deliver!: (response: Response) => void;
    vi.mocked(csrfFetch).mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        deliver = resolve;
      }),
    );
    setupAutoSync();
    await vi.advanceTimersByTimeAsync(30000);
    setClientIdentity({ status: 'anonymous' });
    deliver(reply({}));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not overlap slow hydration retries', async () => {
    let deliver!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          deliver = resolve;
        }),
      )
      .mockResolvedValueOnce(reply([]));
    vi.stubGlobal('fetch', fetchMock);
    await useProgressStore.getState().loadFromServer();
    setupAutoSync();
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    deliver(reply({ xp: 24 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(useProgressStore.getState().xp).toBe(24);
  });

  it('retains dirty data across failed writes and only hydrates after a real save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Load failed')));
    await useProgressStore.getState().loadFromServer();
    useProgressStore.getState().addStudyMinutes(5);
    vi.mocked(csrfFetch).mockResolvedValueOnce(new Response(null, { status: 500 }));
    setupAutoSync();
    await vi.advanceTimersByTimeAsync(30000);
    expect(useProgressStore.getState()).toMatchObject({
      totalStudyMinutes: 5,
      pendingSync: true,
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply({ totalStudyMinutes: 5 }))
      .mockResolvedValueOnce(reply([]));
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(csrfFetch).mockResolvedValueOnce(reply({}));
    await vi.advanceTimersByTimeAsync(30000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(useProgressStore.getState()).toMatchObject({
      totalStudyMinutes: 5,
      pendingSync: false,
      needsHydration: false,
    });
  });
});
