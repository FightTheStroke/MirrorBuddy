import { describe, expect, it, vi } from 'vitest';
import { account, now, storedRow, transport } from './readonly-smoke-fixtures';
import { issueReadonlySmokeSession, revokeReadonlySmokeSession } from '../readonly-smoke';
import { readReadonlySmokeReceipt, signReadonlySmokeReceipt } from '../readonly-smoke-receipt';
import { signCookieValue } from '../cookie-signing';

async function issue() {
  let receipt = '';
  const issued = await issueReadonlySmokeSession(async (value) => {
    receipt = value;
  });
  return { ...issued, receipt, row: storedRow() };
}

describe('receipt-bound scoped revocation', () => {
  it('revokes only its native row, including after expiry and account changes', async () => {
    const { receipt, row } = await issue();
    transport.findSession.mockResolvedValue(row);
    const later = new Date(now.getTime() + 7_200_000);
    transport.query.mockResolvedValue([{ now: later }]);
    transport.users.mockClear();
    transport.users.mockResolvedValue([
      { ...account, disabled: true, role: 'ADMIN', authVersion: 9 },
    ]);
    expect(await revokeReadonlySmokeSession(receipt)).toEqual({ status: 'revoked' });
    expect(transport.revoke).toHaveBeenCalledWith({
      where: { userId: account.id, handleHash: row.handleHash, revokedAt: null },
      data: { revokedAt: later },
    });
    expect(transport.users).not.toHaveBeenCalled();
    expect(transport.accountWrite).not.toHaveBeenCalled();
  });
  it('confirms an already-revoked or absent row without revoking any other session', async () => {
    const { receipt, row } = await issue();
    transport.findSession.mockResolvedValue({ ...row, revokedAt: now });
    expect(await revokeReadonlySmokeSession(receipt)).toEqual({ status: 'already-revoked' });
    transport.findSession.mockResolvedValue(null);
    expect(await revokeReadonlySmokeSession(receipt)).toEqual({ status: 'absent' });
    expect(transport.revoke).not.toHaveBeenCalled();
  });
  it.each([
    { userId: 'other-account' },
    { handleHash: 'b'.repeat(64) },
    { legacyOrigin: true },
    { issuedAt: new Date(0) },
    { expiresAt: new Date(0) },
    { authVersion: 50 },
    { revokedAt: undefined },
    { revokedAt: 'invalid' },
  ])('refuses mismatched session metadata %#', async (change) => {
    const { receipt, row } = await issue();
    transport.findSession.mockResolvedValue({ ...row, ...change });
    await expect(revokeReadonlySmokeSession(receipt)).rejects.toThrow();
    expect(transport.revoke).not.toHaveBeenCalled();
  });
  it('does not confuse undefined or failed reads with an absent row', async () => {
    const { receipt } = await issue();
    transport.findSession.mockResolvedValue(undefined);
    await expect(revokeReadonlySmokeSession(receipt)).rejects.toThrow();
    transport.findSession.mockRejectedValue(new Error('DB unavailable'));
    await expect(revokeReadonlySmokeSession(receipt)).rejects.toThrow('DB unavailable');
    expect(transport.revoke).not.toHaveBeenCalled();
  });
  it.each([undefined, { count: 0 }, { count: 2 }, { count: null }])(
    'requires an exact durable revocation confirmation %#',
    async (result) => {
      const { receipt, row } = await issue();
      transport.findSession.mockResolvedValue(row);
      transport.revoke.mockResolvedValue(result);
      await expect(revokeReadonlySmokeSession(receipt)).rejects.toThrow();
    },
  );
  it('rejects a tampered receipt, a bearer, a hash, and a different configured identity', async () => {
    const { receipt, token, row } = await issue();
    transport.transaction.mockClear();
    for (const value of [`${receipt}x`, token, row.handleHash, `${receipt}.extra`]) {
      await expect(revokeReadonlySmokeSession(value)).rejects.toThrow();
    }
    vi.stubEnv('ADMIN_READONLY_EMAIL', 'someone-else@example.test');
    await expect(revokeReadonlySmokeSession(receipt)).rejects.toThrow();
    expect(transport.transaction).not.toHaveBeenCalled();
  });
  it('rejects a valid generic signature containing invalid JSON or wider receipt metadata', async () => {
    const { receipt } = await issue();
    const original = readReadonlySmokeReceipt(receipt);
    for (const value of ['not-json', JSON.stringify({ ...original, extra: true })]) {
      const invalid = signCookieValue(`rs1:${Buffer.from(value).toString('base64url')}`).signed;
      expect(() => readReadonlySmokeReceipt(invalid)).toThrow();
    }
    expect(() =>
      signReadonlySmokeReceipt({
        ...original,
        expiresAt: new Date(now.getTime() + 3_601_000).toISOString(),
      }),
    ).toThrow();
  });
});
