// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserBackupPayload } from '../user-trash-service';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return {
    prisma: { ...createMockPrisma(), authSession: { create: vi.fn(), createMany: vi.fn() } },
  };
});
vi.mock('@/lib/security', () => ({ hashPII: vi.fn().mockResolvedValue('email-hash') }));

import { prisma } from '@/lib/db';
import { mockSessionTransaction } from '@/test/fixtures/session-compat';
import {
  buildUserBackup,
  createDeletedUserBackup,
  restoreUserFromBackup,
} from '../user-trash-service';

describe('trash authentication state isolation', () => {
  let payload: UserBackupPayload;
  beforeEach(async () => {
    vi.resetAllMocks();
    const snapshot = { id: 'user-1', authVersion: 7, legacyRevoked: false, role: 'USER' };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(snapshot as never);
    for (const model of Object.values(prisma)) {
      if (typeof model === 'object' && model && 'findMany' in model) {
        vi.mocked(model.findMany).mockResolvedValue([]);
      }
    }
    payload = await buildUserBackup('user-1');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    mockSessionTransaction(prisma);
    vi.mocked(prisma.deletedUserBackup.findUnique).mockResolvedValue({
      userId: 'user-1',
      backup: payload,
      purgeAt: new Date('2026-10-01T00:00:00Z'),
    } as never);
  });

  it.each([7, 0, 2147483646])(
    'restores above saved authVersion %i and permanently blocks legacy',
    async (version) => {
      payload.user.authVersion = version;
      await restoreUserFromBackup('user-1', 'admin-1');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'user-1',
          authVersion: version + 1,
          legacyRevoked: true,
        }),
      });
      expect(prisma.authSession.create).not.toHaveBeenCalled();
      expect(prisma.authSession.createMany).not.toHaveBeenCalled();
    },
  );

  it('uses version one for historical snapshots without session metadata', async () => {
    delete payload.user.authVersion;
    delete payload.user.legacyRevoked;
    await restoreUserFromBackup('user-1', 'admin-1');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ authVersion: 1, legacyRevoked: true }),
    });
  });

  it.each([null, '7', -1, 1.5, 2147483647, Number.MAX_SAFE_INTEGER, NaN])(
    'rejects invalid or overflowing authVersion %s',
    async (version) => {
      payload.user.authVersion = version;
      await expect(restoreUserFromBackup('user-1', 'admin-1')).rejects.toThrow(/version/i);
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.deletedUserBackup.delete).not.toHaveBeenCalled();
    },
  );

  it('does not accept nested session or reset-token restoration', async () => {
    payload.user.authSessions = { create: [{ handleHash: 'old-handle', authVersion: 7 }] };
    payload.user.passwordResetTokens = { create: [{ token: 'old-reset' }] };
    await restoreUserFromBackup('user-1', 'admin-1');
    const data = vi.mocked(prisma.user.create).mock.calls[0][0].data;
    expect(data).not.toHaveProperty('authSessions');
    expect(data).not.toHaveProperty('passwordResetTokens');
  });

  it('preserves the saved profile and learning data while excluding authentication rows', async () => {
    payload.profile = { userId: 'user-1', name: 'Student' };
    payload.studySessions = [{ id: 'lesson-1', userId: 'user-1' }];
    payload.user.passwordHash = 'existing-password';
    payload.user.disabled = true;
    await restoreUserFromBackup('user-1', 'admin-1');
    expect(prisma.profile.create).toHaveBeenCalledWith({ data: payload.profile });
    expect(prisma.studySession.createMany).toHaveBeenCalledWith({ data: payload.studySessions });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ passwordHash: 'existing-password', disabled: true }),
    });
    expect(prisma.deletedUserBackup.delete).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('retains the backup when restoration of related data fails', async () => {
    payload.profile = { userId: 'user-1' };
    vi.mocked(prisma.profile.create).mockRejectedValueOnce(new Error('restore failed'));
    await expect(restoreUserFromBackup('user-1', 'admin-1')).rejects.toThrow('restore failed');
    expect(prisma.deletedUserBackup.delete).not.toHaveBeenCalled();
  });

  it.each([null, [], {}])(
    'rejects malformed user metadata %j without creating an account',
    async (metadata) => {
      payload.user = metadata as unknown as Record<string, unknown>;
      await expect(restoreUserFromBackup('user-1', 'admin-1')).rejects.toThrow();
      expect(prisma.user.create).not.toHaveBeenCalled();
    },
  );

  it('rejects mismatched backup identity rather than restoring another account', async () => {
    payload.user.id = 'other-user';
    await expect(restoreUserFromBackup('user-1', 'admin-1')).rejects.toThrow(/identity/i);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('does not overwrite an already recreated account', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'user-1',
      authVersion: 99,
    } as never);
    await expect(restoreUserFromBackup('user-1', 'admin-1')).rejects.toThrow('User already exists');
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses expired backups', async () => {
    vi.mocked(prisma.deletedUserBackup.findUnique).mockResolvedValueOnce({
      userId: 'user-1',
      backup: payload,
      purgeAt: new Date('2026-09-06T00:00:00Z'),
    } as never);
    await expect(restoreUserFromBackup('user-1', 'admin-1')).rejects.toThrow(/expired/i);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('revokes before saving a backup and uses the transaction snapshot', async () => {
    vi.mocked(prisma.deletedUserBackup.findUnique).mockResolvedValue(null);
    const revoked = { id: 'user-1', role: 'USER', authVersion: 8, legacyRevoked: true };
    vi.mocked(prisma.user.update).mockResolvedValueOnce(revoked as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(revoked as never);
    await createDeletedUserBackup('user-1', 'admin-1');
    expect(prisma.user.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'user-1' },
      data: { authVersion: { increment: 1 }, legacyRevoked: true },
    });
    expect(prisma.authSession.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: new Date('2026-09-06T00:00:00Z') },
    });
    expect(vi.mocked(prisma.authSession.updateMany).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(prisma.deletedUserBackup.create).mock.invocationCallOrder[0],
    );
    expect(vi.mocked(prisma.authSession.updateMany).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(prisma.user.findUnique).mock.invocationCallOrder.at(-1)!,
    );
    expect(prisma.deletedUserBackup.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deletedAt: new Date('2026-09-06T00:00:00Z'),
        purgeAt: new Date('2026-10-06T00:00:00Z'),
        backup: expect.objectContaining({
          user: expect.objectContaining({ authVersion: 8, legacyRevoked: true }),
        }),
      }),
    });
  });

  it('does not persist a backup if invalidation fails', async () => {
    vi.mocked(prisma.deletedUserBackup.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.authSession.updateMany).mockRejectedValueOnce(new Error('revocation failed'));
    await expect(createDeletedUserBackup('user-1', 'admin-1')).rejects.toThrow('revocation failed');
    expect(prisma.deletedUserBackup.create).not.toHaveBeenCalled();
  });
});
