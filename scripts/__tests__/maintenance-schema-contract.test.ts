// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => {
  const table = () => ({ deleteMany: vi.fn().mockResolvedValue({ count: 1 }) });
  return {
    prisma: {
      user: {
        count: vi.fn().mockResolvedValue(2),
        findMany: vi.fn().mockResolvedValue([
          { id: 'keep-1', email: 'keep1@example.com', role: 'ADMIN' },
          { id: 'keep-2', email: 'keep2@example.com', role: 'USER' },
        ]),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      sessionMetrics: table(),
      message: table(),
      conversation: table(),
      flashcardProgress: table(),
      quizResult: table(),
      material: table(),
      googleAccount: table(),
      inviteRequest: table(),
      profile: table(),
      settings: table(),
      deletedUserBackup: table(),
      studySession: table(),
      userAchievement: table(),
      authSession: table(),
      $disconnect: vi.fn().mockResolvedValue(undefined),
    },
  };
});
vi.mock('dotenv', () => ({ config: vi.fn() }));
vi.mock('../../apps/web/src/lib/db.js', () => ({ prisma }));
vi.mock('../../apps/web/src/lib/ssl-config', () => ({ createPrismaClient: () => prisma }));

const originalArgv = process.argv;
beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgresql://synthetic.invalid/test');
  process.argv = ['node', 'vitest', '--confirm'];
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  process.argv = originalArgv;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('maintenance commands use current schema ownership', () => {
  it('deletes messages through conversations and uses current material/progress models', async () => {
    const { emergencyCleanup } = await import('../emergency-cleanup.js');
    await emergencyCleanup();
    expect(prisma.message.deleteMany).toHaveBeenCalledWith({
      where: { conversation: { userId: { notIn: ['keep-1', 'keep-2'] } } },
    });
    for (const table of [prisma.flashcardProgress, prisma.quizResult, prisma.material]) {
      expect(table.deleteMany).toHaveBeenCalledWith({
        where: { userId: { notIn: ['keep-1', 'keep-2'] } },
      });
    }
    expect(prisma.inviteRequest.deleteMany).toHaveBeenCalledWith({
      where: { createdUserId: { notIn: ['keep-1', 'keep-2'] } },
    });
  });

  it('preserves the strict keep-count and propagates failed invite deletion', async () => {
    const { emergencyCleanup } = await import('../emergency-cleanup-final');
    prisma.inviteRequest.deleteMany.mockRejectedValueOnce(new Error('synthetic failure'));
    await expect(emergencyCleanup()).rejects.toThrow('synthetic failure');
    expect(prisma.user.deleteMany).not.toHaveBeenCalled();
    expect(prisma.$disconnect).toHaveBeenCalledOnce();
  });

  it('reset removes achievements through gamification and sessions through AuthSession', async () => {
    prisma.user.findMany
      .mockResolvedValueOnce([
        { id: 'keep-1', email: 'keep1@example.com', role: 'ADMIN' },
        { id: 'keep-2', email: 'keep2@example.com', role: 'USER' },
      ])
      .mockResolvedValueOnce([{ id: 'delete-1', email: 'removed@example.com', role: 'USER' }]);
    const { main } = await import('../reset-db-users');
    await main();
    expect(prisma.userAchievement.deleteMany).toHaveBeenCalledWith({
      where: { gamification: { userId: { in: ['delete-1'] } } },
    });
    for (const table of [prisma.authSession, prisma.settings, prisma.profile]) {
      expect(table.deleteMany).toHaveBeenCalledWith({
        where: { userId: { in: ['delete-1'] } },
      });
    }
  });

  it('still does nothing without confirmation', async () => {
    process.argv = ['node', 'vitest'];
    const { emergencyCleanup } = await import('../emergency-cleanup.js');
    await emergencyCleanup();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.user.deleteMany).not.toHaveBeenCalled();
  });
});
