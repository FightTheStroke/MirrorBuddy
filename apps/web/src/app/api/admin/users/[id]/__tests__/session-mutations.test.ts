// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  csrf: vi.fn(),
  email: vi.fn(),
  audit: vi.fn(),
  hash: vi.fn(),
}));
vi.mock('@/lib/auth/server', () => ({
  validateAdminAuth: mocks.auth,
  generateRandomPassword: () => 'temporary-password',
  hashPassword: mocks.hash,
}));
vi.mock('@/lib/security', () => ({ requireCSRF: mocks.csrf }));
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});
vi.mock('@/lib/email', () => ({ sendEmail: mocks.email }));
vi.mock('@/lib/admin/audit-service', () => ({
  logAdminAction: mocks.audit,
  getClientIp: () => '127.0.0.1',
}));
vi.mock('@/lib/admin/user-trash-service', () => ({ createDeletedUserBackup: vi.fn() }));
vi.mock('@/app/api/privacy/delete-my-data/helpers', () => ({
  executeUserDataDeletion: vi.fn(),
}));

import { prisma } from '@/lib/db';
import { POST as resetPassword } from '../reset-password/route';
import { PATCH as updateUser } from '../route';
import { POST as blockUser } from '../../../safety/block-user/route';
import { authenticatedFixture, mockSessionTransaction } from '@/test/fixtures/session-compat';
import { snapshot } from '@/test/fixtures/session-lifecycle';
const mutationTime = new Date('2026-09-06T00:00:00Z');
const reference = authenticatedFixture('admin-1').session;
const actor = {
  ...reference,
  checkedAt: mutationTime,
  validUntil: new Date('2026-09-13T00:00:00Z'),
  session: {
    ...reference.session,
    issuedAt: new Date('2026-09-05T00:00:00Z'),
    expiresAt: new Date('2026-09-13T00:00:00Z'),
  },
};
const actorRow = () =>
  snapshot({
    userId: actor.userId,
    sessionUserId: actor.userId,
    handleHash: actor.session.kind === 'modern' ? actor.session.handleHash : null,
    dbNow: mutationTime,
    issuedAt: actor.session.issuedAt,
    expiresAt: actor.session.expiresAt,
  });
let sessionWrites: ReturnType<typeof mockSessionTransaction>;

const target = {
  id: 'user-1',
  email: 'user@example.test',
  username: 'student',
  role: 'USER',
  disabled: false,
};
const context = { params: Promise.resolve({ id: target.id }) };
const request = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/users/user-1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('administrative session mutation callers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({
      authenticated: true,
      isAdmin: true,
      userId: 'admin-1',
      session: actor,
    });
    mocks.csrf.mockReturnValue(true);
    mocks.hash.mockResolvedValue('new-hash');
    sessionWrites = mockSessionTransaction(prisma);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([actorRow()]);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValue(target as never)
      .mockResolvedValueOnce(target as never)
      .mockResolvedValueOnce({ role: 'ADMIN' } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ ...target, disabled: true } as never);
  });

  it('resets credentials through global revocation without issuing cookies', async () => {
    const response = await resetPassword(request({}), context);
    expect(response.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: target.id },
      data: {
        passwordHash: 'new-hash',
        mustChangePassword: true,
        authVersion: { increment: 1 },
        legacyRevoked: true,
      },
    });
    expect(sessionWrites.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: target.id, revokedAt: null },
      data: { revokedAt: mutationTime },
    });
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { userId: target.id, used: false },
      data: { used: true },
    });
    expect(mocks.email).toHaveBeenCalledOnce();
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'RESET_PASSWORD' }));
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('does not deliver or report a new password when revocation fails', async () => {
    sessionWrites.updateMany.mockRejectedValueOnce(new Error('database unavailable'));
    const response = await resetPassword(request({}), context);
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(mocks.email).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it('disables through the transaction revocation primitive and preserves role updates', async () => {
    const response = await updateUser(request({ disabled: true, role: 'ADMIN' }), context);
    expect(response.status).toBe(200);
    expect(prisma.user.update).toHaveBeenNthCalledWith(1, {
      where: { id: target.id },
      data: { disabled: true, authVersion: { increment: 1 }, legacyRevoked: true },
    });
    expect(sessionWrites.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: target.id, revokedAt: null },
      data: { revokedAt: mutationTime },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: target.id },
      data: { role: 'ADMIN' },
    });
    expect(prisma.tierAuditLog.create).toHaveBeenCalledOnce();
    expect(sessionWrites.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(prisma.user.update).mock.invocationCallOrder[1],
    );
  });

  it('reenables without lowering authVersion or clearing legacy/session revocation', async () => {
    const response = await updateUser(request({ disabled: false }), context);
    expect(response.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: target.id },
      data: { disabled: false },
    });
    expect(sessionWrites.updateMany).not.toHaveBeenCalled();
  });

  it('does not report success or apply role changes when disable revocation fails', async () => {
    sessionWrites.updateMany.mockRejectedValueOnce(new Error('revocation failed'));
    const response = await updateUser(request({ disabled: true, role: 'ADMIN' }), context);
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(prisma.user.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: target.id },
      data: { disabled: true, authVersion: { increment: 1 }, legacyRevoked: true },
    });
    expect(prisma.tierAuditLog.create).not.toHaveBeenCalled();
  });

  it.each([null, { disabled: 'false' }, { disabled: null }, { disabled: 0 }])(
    'rejects malformed account state %j without mutating',
    async (body) => {
      expect((await updateUser(request(body), context)).status).toBe(400);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(sessionWrites.updateMany).not.toHaveBeenCalled();
    },
  );

  it('safety blocking uses the same durable disable service', async () => {
    const response = await blockUser(request({ userId: target.id, reason: 'safety' }));
    expect(response.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: target.id },
      data: { disabled: true, authVersion: { increment: 1 }, legacyRevoked: true },
    });
    expect(sessionWrites.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: target.id, revokedAt: null },
      data: { revokedAt: mutationTime },
    });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'BLOCK_USER' }));
  });

  it('does not audit successful blocking when durable invalidation fails', async () => {
    sessionWrites.updateMany.mockRejectedValueOnce(new Error('revocation failed'));
    expect((await blockUser(request({ userId: target.id }))).status).toBeGreaterThanOrEqual(500);
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it.each([null, { userId: {} }, { userId: '' }])(
    'rejects invalid block identity %j',
    async (body) => {
      expect((await blockUser(request(body))).status).toBe(400);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(sessionWrites.updateMany).not.toHaveBeenCalled();
    },
  );

  it('requires CSRF before admin authorization', async () => {
    mocks.csrf.mockReturnValueOnce(false);
    expect((await resetPassword(request({}), context)).status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(sessionWrites.updateMany).not.toHaveBeenCalled();
  });

  it('does not allow read-only administrators to mutate credentials', async () => {
    mocks.auth.mockResolvedValueOnce({ authenticated: true, isAdmin: false, userId: 'reader' });
    expect((await resetPassword(request({}), context)).status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(sessionWrites.updateMany).not.toHaveBeenCalled();
  });

  it('rechecks the acting session before any mutation', async () => {
    vi.mocked(prisma.$queryRaw)
      .mockReset()
      .mockResolvedValue([{ ...actorRow(), revokedAt: mutationTime }]);
    expect((await resetPassword(request({}), context)).status).toBe(401);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(sessionWrites.updateMany).not.toHaveBeenCalled();
    expect(mocks.email).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
