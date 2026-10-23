import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  conversationCount: vi.fn(),
  groups: vi.fn(),
  lastConversation: vi.fn(),
  messages: vi.fn(),
  lastMessage: vi.fn(),
  cards: vi.fn(),
  materials: vi.fn(),
  metrics: vi.fn(),
  settings: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mocks.user },
    conversation: {
      count: mocks.conversationCount,
      groupBy: mocks.groups,
      findFirst: mocks.lastConversation,
    },
    message: { count: mocks.messages, findFirst: mocks.lastMessage },
    flashcardProgress: { count: mocks.cards },
    material: { count: mocks.materials },
    sessionMetrics: { aggregate: mocks.metrics },
    settings: { findUnique: mocks.settings },
  },
}));
vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (..._steps: unknown[]) =>
    (handler: unknown) =>
      handler,
  withSentry: vi.fn(),
  withAdminReadOnly: vi.fn(),
}));

const request = () =>
  GET({
    req: new Request('http://localhost/api/admin/users/student/stats'),
    params: Promise.resolve({ id: 'student' }),
  } as never);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: 'student', updatedAt: new Date('2026-10-23T12:00:00Z') });
  mocks.conversationCount.mockResolvedValue(0);
  mocks.groups.mockResolvedValue([]);
  mocks.lastConversation.mockResolvedValue(null);
  mocks.lastMessage.mockResolvedValue(null);
  mocks.messages.mockResolvedValue(0);
  mocks.cards.mockResolvedValue(0);
  mocks.materials.mockResolvedValue(0);
  mocks.metrics.mockResolvedValue({ _count: 42, _sum: { voiceMinutes: 0 } });
  mocks.settings.mockResolvedValue(null);
});

describe('retained user statistics', () => {
  it('does not turn an account update into student activity', async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect((await response.json()).user.lastActivity).toBeNull();
  });

  it('reports the latest actual student message, not an account or conversation edit', async () => {
    const activity = new Date('2026-10-20T10:00:00Z');
    mocks.lastMessage.mockResolvedValue({ createdAt: activity });
    const data = await (await request()).json();
    expect(data.user.lastActivity).toBe(activity.toISOString());
    expect(mocks.lastMessage).toHaveBeenCalledWith({
      where: { conversation: { userId: 'student' }, role: 'user' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
  });

  it('counts reviewed cards from review records, never session counts', async () => {
    mocks.cards.mockResolvedValueOnce(5).mockResolvedValueOnce(2);
    const data = await (await request()).json();
    expect(data.stats.flashcards).toEqual({ total: 5, reviewed: 2 });
    expect(mocks.cards).toHaveBeenCalledWith({
      where: { userId: 'student', reps: { gt: 0 } },
    });
  });

  it('returns not found rather than synthetic statistics for a missing user', async () => {
    mocks.user.mockResolvedValue(null);
    expect((await request()).status).toBe(404);
    expect(mocks.messages).not.toHaveBeenCalled();
  });
});
