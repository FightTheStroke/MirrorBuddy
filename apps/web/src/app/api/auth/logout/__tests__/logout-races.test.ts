import { describe, expect, it } from 'vitest';
import {
  transport,
  nativeSession,
  request,
  expectCleared,
  expectNoRevocation,
} from './logout-fixtures';
import { POST } from '../route';
import { dbNow } from '@/test/fixtures/session-lifecycle';

describe('logout transaction races remain distinct from rejected-cookie recovery', () => {
  it('keeps same-version duplicate current logout idempotent', async () => {
    nativeSession({}, { revokedAt: dbNow });
    expect((await POST(request())).status).toBe(200);
    expectCleared();
    expectNoRevocation();
  });

  it.each(['current', 'all'])(
    'does not claim %s revocation after password replacement wins',
    async (scope) => {
      const issued = nativeSession({}, { userAuthVersion: 5, revokedAt: dbNow });
      transport.tx.user.findUnique.mockResolvedValue({ authVersion: 5 });
      const response = await POST(request(JSON.stringify({ scope })));
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ code: 'SESSION_REJECTED' });
      expect(transport.set).not.toHaveBeenCalled();
      expectNoRevocation();

      if (scope === 'current') {
        transport.tx.$queryRaw
          .mockReset()
          .mockResolvedValue([{ ...issued.row, userAuthVersion: 5, revokedAt: dbNow }]);
        expect((await POST(request())).status).toBe(200);
        expectCleared();
        expectNoRevocation();
      }
    },
  );

  it('does not turn expiry between read and revocation into durable success', async () => {
    nativeSession({}, { dbNow: new Date('2026-02-01T00:00:00.000Z') });
    expect((await POST(request())).status).toBe(401);
    expect(transport.set).not.toHaveBeenCalled();
    expectNoRevocation();
  });

  it.each(['current', 'all'])(
    'does not clear cookies after %s transaction failure',
    async (scope) => {
      nativeSession();
      transport.transaction.mockRejectedValue(new Error('commit acknowledgement unavailable'));
      expect((await POST(request(JSON.stringify({ scope })))).status).toBe(500);
      expect(transport.set).not.toHaveBeenCalled();
      expectNoRevocation();
    },
  );

  it('does not swallow an error object merely carrying the rejected code', async () => {
    nativeSession();
    transport.transaction.mockRejectedValue({ code: 'SESSION_REJECTED' });
    expect((await POST(request())).status).toBe(500);
    expect(transport.set).not.toHaveBeenCalled();
  });

  it('surfaces cookie transport failure rather than claiming recovery success', async () => {
    nativeSession({ expiresAt: dbNow });
    transport.set.mockImplementation(() => {
      throw new Error('cookie writer unavailable');
    });
    expect((await POST(request())).status).toBe(500);
    expectNoRevocation();
  });
});
