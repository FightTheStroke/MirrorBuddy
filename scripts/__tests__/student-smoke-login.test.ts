// @vitest-environment node
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loginStudent,
  logoutStudent,
  preflightStudent,
  studentIdentity,
} from '../lib/student-smoke-login';

const token = `s2:${'a'.repeat(43)}.${'b'.repeat(64)}`;
const identity = {
  id: 'dedicated-test',
  email: 'student@example.test',
  username: 'smoke-student',
  password: 'only-a-fixture-password',
};
const account = {
  id: identity.id,
  username: identity.username,
  role: 'USER',
  disabled: false,
  isTestData: true,
  mustChangePassword: false,
  emailHash: createHash('sha256').update(identity.email).digest('hex'),
};
const loginBody = { user: { ...account } };
const authCookie = `mirrorbuddy-user-id=${encodeURIComponent(token)}; Path=/; Secure; HttpOnly`;
const response = (body: unknown, status = 200, cookie?: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { 'set-cookie': cookie } : {}),
    },
  });
const fetcher = vi.fn<typeof fetch>();
const receipt = { starting: vi.fn(), token: vi.fn(), revoked: vi.fn() };
function cleanupResponses() {
  fetcher
    .mockResolvedValueOnce(
      response(
        { csrfToken: 'c'.repeat(43) },
        200,
        `csrf-token=${'c'.repeat(43)}; Path=/; Secure; HttpOnly`,
      ),
    )
    .mockResolvedValueOnce(response({ success: true }))
    .mockResolvedValueOnce(response({ code: 'SESSION_REJECTED' }, 401));
}
beforeEach(() => vi.resetAllMocks());

describe('normal password smoke bootstrap', () => {
  it('requires every existing GitHub credential, without choosing a local identity', () => {
    const env = {
      NODE_ENV: 'production',
      PROD_TEST_USER_ID: identity.id,
      PROD_TEST_USER_EMAIL: identity.email,
      PROD_TEST_USER_USERNAME: identity.username,
      PROD_TEST_USER_PASSWORD: identity.password,
    } satisfies NodeJS.ProcessEnv;
    expect(studentIdentity(env)).toEqual(identity);
    for (const key of Object.keys(env).filter((key) => key !== 'NODE_ENV'))
      expect(() => studentIdentity({ ...env, [key]: '' })).toThrow();
    expect(() => studentIdentity(undefined)).toThrow();
  });
  it('preflights all identity aliases in one exact unique test-only lookup', async () => {
    const user = { findMany: vi.fn().mockResolvedValue([account]) };
    await preflightStudent(user, identity);
    expect(user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { id: identity.id },
            { emailHash: account.emailHash },
            { username: identity.username },
          ],
        },
      }),
    );
  });
  it.each(
    [
      [],
      [account, account],
      [null],
      [{ ...account, id: 'real-user' }],
      [{ ...account, isTestData: false }],
      [{ ...account, disabled: true }],
      [{ ...account, role: 'ADMIN' }],
      [{ ...account, emailHash: 'wrong' }],
      [{ ...account, username: 'other' }],
      [{ ...account, mustChangePassword: true }],
    ].map((rows) => ({ rows })),
  )('rejects absent, ambiguous, real or mismatched users before login', async ({ rows }) => {
    await expect(
      preflightStudent({ findMany: vi.fn().mockResolvedValue(rows) }, identity),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('logs in without an old cookie and verifies a native dedicated identity', async () => {
    fetcher
      .mockResolvedValueOnce(response(loginBody, 200, authCookie))
      .mockResolvedValueOnce(response(account));
    expect(await loginStudent(identity, receipt, fetcher)).toBe(token);
    expect(receipt.starting).toHaveBeenCalledOnce();
    expect(receipt.token).toHaveBeenCalledWith(token);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://mirrorbuddy.vercel.app/api/auth/login');
    expect(options).toMatchObject({
      method: 'POST',
      redirect: 'manual',
      body: JSON.stringify({ username: identity.username, password: identity.password }),
    });
    expect(JSON.stringify(options?.headers)).not.toContain('Cookie');
    expect(receipt.revoked).not.toHaveBeenCalled();
  });
  it.each([301, 302, 303, 307, 308, 401, 503])(
    'rejects HTTP %s without following redirects',
    async (status) => {
      fetcher.mockResolvedValueOnce(response({ error: 'secret-data' }, status));
      await expect(loginStudent(identity, receipt, fetcher)).rejects.toThrow(
        'STUDENT_LOGIN_FAILED',
      );
      expect(fetcher).toHaveBeenCalledOnce();
      expect(fetcher.mock.calls[0][1]?.redirect).toBe('manual');
    },
  );
  it.each([
    null,
    {},
    { user: { ...account, id: 'real-user' } },
    { user: { ...account, role: 'ADMIN' } },
    { user: { ...account, mustChangePassword: true } },
  ])('revokes its received session even when the login body is wrong', async (body) => {
    fetcher.mockResolvedValueOnce(response(body, 200, authCookie));
    cleanupResponses();
    await expect(loginStudent(identity, receipt, fetcher)).rejects.toThrow('STUDENT_LOGIN_FAILED');
    expect(receipt.token).toHaveBeenCalledWith(token);
    expect(receipt.revoked).toHaveBeenCalledOnce();
  });
  it('revokes after wrong /api/user test identity', async () => {
    fetcher
      .mockResolvedValueOnce(response(loginBody, 200, authCookie))
      .mockResolvedValueOnce(response({ ...account, isTestData: false }));
    cleanupResponses();
    await expect(loginStudent(identity, receipt, fetcher)).rejects.toThrow('STUDENT_LOGIN_FAILED');
    expect(receipt.revoked).toHaveBeenCalledOnce();
  });
  it('revokes even when private token persistence fails', async () => {
    fetcher.mockResolvedValueOnce(response(loginBody, 200, authCookie));
    receipt.token.mockRejectedValueOnce(new Error('private write failed'));
    cleanupResponses();
    await expect(loginStudent(identity, receipt, fetcher)).rejects.toThrow();
    expect(receipt.revoked).toHaveBeenCalledOnce();
  });
  it('fails closed on lost login responses and does not invent a cleanup success', async () => {
    fetcher.mockRejectedValueOnce(new Error('network password secret'));
    await expect(loginStudent(identity, receipt, fetcher)).rejects.toThrow('STUDENT_LOGIN_FAILED');
    expect(receipt.starting).toHaveBeenCalledOnce();
    expect(receipt.revoked).not.toHaveBeenCalled();
  });
  it('never accepts a legacy cookie', async () => {
    fetcher.mockResolvedValueOnce(response(loginBody, 200, 'mirrorbuddy-user-id=legacy.signature'));
    await expect(loginStudent(identity, receipt, fetcher)).rejects.toThrow('STUDENT_LOGIN_FAILED');
    expect(receipt.token).not.toHaveBeenCalled();
  });
});

describe('owned current-session logout', () => {
  it('uses normal CSRF logout and proves the original cookie was rejected', async () => {
    cleanupResponses();
    await logoutStudent(token, fetcher);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      'https://mirrorbuddy.vercel.app/api/session',
      'https://mirrorbuddy.vercel.app/api/auth/logout',
      'https://mirrorbuddy.vercel.app/api/user',
    ]);
    expect(fetcher.mock.calls[1][1]).toMatchObject({
      method: 'POST',
      redirect: 'manual',
      body: '{"scope":"current"}',
      headers: expect.objectContaining({ 'x-csrf-token': 'c'.repeat(43) }),
    });
    expect(fetcher.mock.calls[2][1]?.headers).toMatchObject({
      Cookie: `mirrorbuddy-user-id=${token}`,
    });
  });
  it.each([200, 302, 403, 500, 503])(
    'does not call cleanup proven if original token gets HTTP %s',
    async (status) => {
      cleanupResponses();
      fetcher.mockReset();
      fetcher
        .mockResolvedValueOnce(
          response({ csrfToken: 'c'.repeat(43) }, 200, `csrf-token=${'c'.repeat(43)}`),
        )
        .mockResolvedValueOnce(response({ success: true }))
        .mockResolvedValueOnce(response(account, status));
      await expect(logoutStudent(token, fetcher)).rejects.toThrow('STUDENT_CLEANUP_FAILED');
    },
  );
  it('sanitizes transport failures', async () => {
    fetcher.mockRejectedValueOnce(new Error(`private bearer ${token}`));
    await expect(logoutStudent(token, fetcher)).rejects.toThrow('STUDENT_CLEANUP_FAILED');
  });
});
