import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionsPatchSchema, SessionsPostSchema } from '@/lib/validation/schemas/progress';
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
const session = {
  id: 'local-session',
  maestroId: 'pythagoras',
  subject: 'math',
  startedAt: new Date('2026-08-29T12:00:00Z'),
  endedAt: new Date('2026-08-29T12:05:00Z'),
  durationMinutes: 5,
  questionsAsked: 1,
  xpEarned: 2,
  mirrorBucksEarned: 2,
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.clearAllMocks();
  useProgressStore.setState(useProgressStore.getInitialState(), true);
  useProgressStore.setState({ pendingSync: true, sessionHistory: [session] });
});
afterEach(() => vi.unstubAllGlobals());

describe('progress sessions use the actual API contracts', () => {
  it('creates and completes sessions with bodies accepted by the strict route schemas', async () => {
    expect(SessionsPostSchema.safeParse(session).success).toBe(false);
    vi.mocked(csrfFetch).mockImplementation(async (_url, options) => {
      const body: unknown = JSON.parse(String(options?.body));
      if (options?.method === 'POST') {
        expect(SessionsPostSchema.safeParse(body).success).toBe(true);
        return reply({ id: 'server-session' });
      }
      if (options?.method === 'PATCH') {
        expect(SessionsPatchSchema.safeParse(body).success).toBe(true);
        expect(body).toEqual({ id: 'server-session', duration: 5, xpEarned: 2, questions: 1 });
      }
      return reply({});
    });
    await useProgressStore.getState().syncToServer();
    expect(vi.mocked(csrfFetch).mock.calls.map(([, options]) => options?.method)).toEqual([
      'PUT',
      'POST',
      'PATCH',
    ]);
    expect(useProgressStore.getState()).toMatchObject({
      pendingSync: false,
      sessionHistory: [{ ...session, id: 'synced-server-session' }],
    });
  });

  it('resumes a failed completion without creating a second server session', async () => {
    vi.mocked(csrfFetch)
      .mockResolvedValueOnce(reply({}))
      .mockResolvedValueOnce(reply({ id: 'server-session' }))
      .mockResolvedValueOnce(reply({ error: 'unavailable' }, 500));
    await useProgressStore.getState().syncToServer();
    expect(useProgressStore.getState()).toMatchObject({
      pendingSync: true,
      sessionHistory: [{ ...session, serverId: 'server-session' }],
    });

    vi.mocked(csrfFetch).mockResolvedValue(reply({}));
    await useProgressStore.getState().syncToServer();
    expect(vi.mocked(csrfFetch).mock.calls.map(([, options]) => options?.method)).toEqual([
      'PUT',
      'POST',
      'PATCH',
      'PUT',
      'PATCH',
    ]);
    expect(useProgressStore.getState().pendingSync).toBe(false);
  });

  it('does not resend completed sessions when later progress changes', async () => {
    vi.mocked(csrfFetch).mockImplementation(async (_url, options) =>
      reply(options?.method === 'POST' ? { id: 'server-session' } : {}),
    );
    await useProgressStore.getState().syncToServer();
    useProgressStore.getState().addStudyMinutes(1);
    await useProgressStore.getState().syncToServer();
    expect(
      vi.mocked(csrfFetch).mock.calls.filter(([, options]) => options?.method === 'POST'),
    ).toHaveLength(1);
  });

  it('keeps a backlog beyond one batch pending until it is uploaded', async () => {
    useProgressStore.setState({
      sessionHistory: Array.from({ length: 11 }, (_, i) => ({ ...session, id: `local-${i}` })),
    });
    let created = 0;
    vi.mocked(csrfFetch).mockImplementation(async (_url, options) =>
      reply(options?.method === 'POST' ? { id: `server-${created++}` } : {}),
    );
    await useProgressStore.getState().syncToServer();
    expect(useProgressStore.getState().pendingSync).toBe(true);
    await useProgressStore.getState().syncToServer();
    expect(useProgressStore.getState().pendingSync).toBe(false);
    expect(created).toBe(11);
  });

  it('acknowledges writes despite concurrent hydration bookkeeping', async () => {
    useProgressStore.setState({ sessionHistory: [] });
    let deliver!: (response: Response) => void;
    vi.mocked(csrfFetch).mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        deliver = resolve;
      }),
    );
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Load failed')));
    const saving = useProgressStore.getState().syncToServer();
    await useProgressStore.getState().loadFromServer();
    deliver(reply({}));
    await saving;
    expect(useProgressStore.getState()).toMatchObject({ pendingSync: false, needsHydration: true });
  });

  it('does not start duplicate writes when another sync is in flight', async () => {
    useProgressStore.setState({ sessionHistory: [] });
    let deliver!: (response: Response) => void;
    vi.mocked(csrfFetch).mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        deliver = resolve;
      }),
    );
    const saving = useProgressStore.getState().syncToServer();
    await useProgressStore.getState().syncToServer();
    expect(csrfFetch).toHaveBeenCalledTimes(1);
    deliver(reply({}));
    await saving;
  });

  it.each([null, {}, { id: '' }])(
    'does not acknowledge invalid creation response: %j',
    async (body) => {
      vi.mocked(csrfFetch).mockResolvedValueOnce(reply({})).mockResolvedValueOnce(reply(body));
      await useProgressStore.getState().syncToServer();
      expect(useProgressStore.getState().pendingSync).toBe(true);
    },
  );
});
