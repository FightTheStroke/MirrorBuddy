import { describe, expect, it } from 'vitest';
import {
  transport,
  nativeSession,
  legacySession,
  request,
  expectCleared,
  expectNoRevocation,
} from './logout-fixtures';
import { POST } from '../route';
import { dbNow } from '@/test/fixtures/session-lifecycle';
import { AUTH_COOKIE_NAME } from '@/lib/auth';

describe('actual CSRF-protected logout route', () => {
  it.each([
    { reason: 'expired', row: { expiresAt: dbNow } },
    { reason: 'revoked', row: { revokedAt: dbNow } },
    { reason: 'version mismatch', row: { userAuthVersion: 5 } },
    { reason: 'disabled owner', row: { userDisabled: true } },
  ])('recovers this browser from $reason without claiming durable revocation', async ({ row }) => {
    nativeSession(row);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expectCleared();
    expectNoRevocation();
    expect(transport.transaction).not.toHaveBeenCalled();
  });

  it.each(['', 'unsigned', 's2:malformed.signature'])(
    'clears a definitively malformed presented credential %j',
    async (token) => {
      transport.jar.set(AUTH_COOKIE_NAME, token);
      expect((await POST(request('{"scope":"current"}'))).status).toBe(200);
      expectCleared();
      expect(transport.tx.$queryRaw).not.toHaveBeenCalled();
      expectNoRevocation();
    },
  );

  it('allows absent current-browser logout without a database read', async () => {
    expect((await POST(request())).status).toBe(200);
    expectCleared();
    expect(transport.tx.$queryRaw).not.toHaveBeenCalled();
    expectNoRevocation();
  });

  it('rejects absent all-session logout without clearing or revoking', async () => {
    const response = await POST(request('{"scope":"all"}'));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'AUTH_ABSENT' });
    expect(transport.set).not.toHaveBeenCalled();
    expectNoRevocation();
  });

  it.each(['expired', 'malformed'])('never reports all-session success for %s', async (kind) => {
    if (kind === 'expired') nativeSession({ expiresAt: dbNow });
    else transport.jar.set(AUTH_COOKIE_NAME, 's2:invalid.signature');
    const response = await POST(request('{"scope":"all"}'));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'SESSION_REJECTED' });
    expect(transport.set).not.toHaveBeenCalled();
    expectNoRevocation();
  });

  it('revokes only the authorized native row before clearing current cookies', async () => {
    const issued = nativeSession();
    expect((await POST(request())).status).toBe(200);
    expect(transport.tx.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'session-owner', handleHash: issued.handleHash, revokedAt: null },
      data: { revokedAt: dbNow },
    });
    expect(transport.tx.user.update).not.toHaveBeenCalled();
    expectCleared();
    expect(transport.tx.authSession.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      transport.set.mock.invocationCallOrder[0],
    );
  });

  it('requires and performs durable global invalidation before all-session success', async () => {
    nativeSession();
    expect((await POST(request('{"scope":"all"}'))).status).toBe(200);
    expect(transport.tx.user.update).toHaveBeenCalledWith({
      where: { id: 'session-owner' },
      data: { authVersion: { increment: 1 }, legacyRevoked: true },
    });
    expect(transport.tx.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'session-owner', revokedAt: null },
      data: { revokedAt: dbNow },
    });
    expectCleared();
  });

  it('retains active legacy-family revocation without revoking independent native rows', async () => {
    legacySession();
    expect((await POST(request())).status).toBe(200);
    expect(transport.tx.user.update).toHaveBeenCalledWith({
      where: { id: 'session-owner' },
      data: { legacyRevoked: true },
    });
    expect(transport.tx.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'session-owner', legacyOrigin: true, revokedAt: null },
      data: { revokedAt: dbNow },
    });
    expectCleared();
  });

  it.each(['current', 'all'])('preserves NOT_ACTIVATED failure for %s', async (scope) => {
    legacySession({ activationId: null, sessionActivatedAt: null });
    const response = await POST(request(JSON.stringify({ scope })));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'SESSION_NOT_ACTIVATED' });
    expect(transport.set).not.toHaveBeenCalled();
    expectNoRevocation();
  });

  it.each(['current', 'all'])('preserves database outage for %s', async (scope) => {
    nativeSession();
    transport.tx.$queryRaw.mockReset().mockRejectedValue(new Error('database offline'));
    const response = await POST(request(JSON.stringify({ scope })));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'SESSION_UNAVAILABLE' });
    expect(transport.set).not.toHaveBeenCalled();
    expectNoRevocation();
  });

  it('keeps malformed database metadata unavailable rather than locally recoverable', async () => {
    nativeSession();
    transport.tx.$queryRaw.mockReset().mockResolvedValue([{}]);
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(transport.set).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'enforces real CSRF before rejected-cookie recovery (mismatch=%s)',
    async (mismatch) => {
      transport.jar.set(AUTH_COOKIE_NAME, 'unsigned');
      const req = request('', mismatch);
      if (mismatch) req.headers.set('X-CSRF-Token', 'incorrect');
      expect((await POST(req)).status).toBe(403);
      expect(transport.set).not.toHaveBeenCalled();
      expect(transport.tx.$queryRaw).not.toHaveBeenCalled();
    },
  );

  it.each(['null', '[]', '{"scope":"other"}', '{bad'])(
    'rejects invalid requests %s before clearing',
    async (body) => {
      transport.jar.set(AUTH_COOKIE_NAME, 'unsigned');
      expect((await POST(request(body))).status).toBe(400);
      expect(transport.set).not.toHaveBeenCalled();
    },
  );
});
