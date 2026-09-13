import { describe, expect, it, vi } from 'vitest';
import { account, emailHash, now, transport } from './readonly-smoke-fixtures';
import { issueReadonlySmokeSession, revokeReadonlySmokeSession } from '../readonly-smoke';
import { parseSessionToken } from '../session-token';
import { resolveSessionToken } from '../session-reader';
import { snapshot } from './session-lifecycle-fixtures';

describe('constrained existing-account readonly smoke issuance', () => {
  it('uses DB time, fixed 60 minutes, native hash-only persistence and a non-bearer receipt', async () => {
    let receipt = '';
    const issued = await issueReadonlySmokeSession(async (value) => {
      receipt = value;
    });
    expect(transport.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    });
    expect(transport.users).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { emailHash },
        take: 2,
      }),
    );
    const parsed = parseSessionToken(issued.token);
    expect(parsed.valid && parsed.kind === 'modern').toBe(true);
    if (!parsed.valid || parsed.kind !== 'modern') throw new Error('Native fixture token required');
    expect(parseSessionToken(parsed.handleHash).valid).toBe(false);
    expect(JSON.stringify(transport.create.mock.calls).includes(parsed.handle)).toBe(false);
    expect(transport.create.mock.calls[0][0].data).toEqual({
      handleHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      userId: account.id,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + 3_600_000),
      authVersion: 4,
      legacyOrigin: false,
    });
    expect(JSON.stringify(transport.create.mock.calls).includes(issued.token)).toBe(false);
    expect(receipt.includes(issued.token)).toBe(false);
    expect(parseSessionToken(receipt).valid).toBe(false);
    expect(transport.accountWrite).not.toHaveBeenCalled();
  });

  it('resolves the native credential without activation, then denies its exact immutable expiry', async () => {
    const issued = await issueReadonlySmokeSession(async () => {});
    const parsed = parseSessionToken(issued.token);
    if (!parsed.valid || parsed.kind !== 'modern') throw new Error('Native fixture token required');
    const expiresAt = new Date(now.getTime() + 3_600_000);
    const row = snapshot({
      activationId: null,
      sessionActivatedAt: null,
      dbNow: now,
      userId: account.id,
      userAuthVersion: 4,
      userLegacyRevoked: false,
      handleHash: parsed.handleHash,
      sessionUserId: account.id,
      sessionAuthVersion: 4,
      issuedAt: now,
      expiresAt,
    });
    transport.query.mockResolvedValue([row]);
    expect(await resolveSessionToken(issued.token)).toMatchObject({
      status: 'AUTHENTICATED',
      userId: account.id,
      validUntil: expiresAt,
    });
    transport.query.mockResolvedValue([{ ...row, dbNow: expiresAt }]);
    expect(await resolveSessionToken(issued.token)).toEqual({
      status: 'DENIED',
      reason: 'SESSION_EXPIRED',
    });
  });

  it('requires a receipt writer rather than accepting a missing delivery contract', async () => {
    await expect(
      Reflect.apply(issueReadonlySmokeSession, undefined, [undefined]),
    ).rejects.toThrow();
    expect(transport.transaction).not.toHaveBeenCalled();
  });

  it('persists cleanup authority before transaction commit and does not create activation', async () => {
    const order: string[] = [];
    transport.transaction.mockImplementationOnce(async (work) => {
      const result = await work({
        $queryRaw: transport.query,
        user: { findMany: transport.users },
        authSession: { create: transport.create },
      });
      order.push('commit');
      return result;
    });
    await issueReadonlySmokeSession(async () => {
      order.push('receipt');
    });
    expect(order).toEqual(['receipt', 'commit']);
    expect(transport.query).toHaveBeenCalledTimes(1);
  });

  it.each([
    null,
    undefined,
    [],
    [{ ...account }, { ...account }],
    [{ ...account, role: 'ADMIN' }],
    [{ ...account, role: 'USER' }],
    [{ ...account, disabled: true }],
    [{ ...account, disabled: null }],
    [{ ...account, passwordHash: null }],
    [{ ...account, passwordHash: '$2b$12$not-the-marker' }],
    [{ ...account, emailHash: 'b'.repeat(64) }],
    [{ ...account, id: null }],
    [{ ...account, authVersion: -1 }],
    [{ ...account, authVersion: 1.5 }],
    [{ ...account, authVersion: 2_147_483_648 }],
  ])('rejects missing, ambiguous or ineligible account metadata %#', async (rows) => {
    transport.users.mockResolvedValue(rows);
    const persist = vi.fn();
    await expect(issueReadonlySmokeSession(persist)).rejects.toThrow();
    expect(transport.create).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it.each(['', ' ', 'not-an-email'])(
    'rejects invalid configured identity %j before DB access',
    async (email) => {
      vi.stubEnv('ADMIN_READONLY_EMAIL', email);
      await expect(issueReadonlySmokeSession(async () => {})).rejects.toThrow();
      expect(transport.transaction).not.toHaveBeenCalled();
    },
  );

  it('aborts issuance when durable receipt persistence fails', async () => {
    await expect(
      issueReadonlySmokeSession(async () => {
        throw new Error('private receipt persistence failed');
      }),
    ).rejects.toThrow('private receipt persistence failed');
  });

  it('never turns DB failures into an issued credential', async () => {
    transport.transaction.mockRejectedValue(new Error('database unavailable'));
    await expect(issueReadonlySmokeSession(async () => {})).rejects.toThrow('database unavailable');
  });

  it.each([null, undefined, '', 's2:invalid.signature', 'a'.repeat(4097)])(
    'rejects invalid cleanup authority before DB access %#',
    async (receipt) => {
      await expect(revokeReadonlySmokeSession(receipt)).rejects.toThrow();
      expect(transport.transaction).not.toHaveBeenCalled();
    },
  );
});
