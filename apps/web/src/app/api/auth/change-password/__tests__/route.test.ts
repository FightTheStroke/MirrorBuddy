import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  verifyPassword: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));
vi.mock('@/lib/auth/server', () => ({
  hashPassword: vi.fn(),
  verifyPassword: mocks.verifyPassword,
  validatePasswordStrength: () => ({ valid: true, errors: [] }),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: mocks.log.info,
    warn: mocks.log.warn,
    error: mocks.log.error,
    debug: mocks.log.debug,
    child: () => ({
      info: mocks.log.info,
      warn: mocks.log.warn,
      error: mocks.log.error,
      debug: mocks.log.debug,
    }),
  },
}));
vi.mock('@/lib/rate-limit', () => ({ RATE_LIMITS: { AUTH_PASSWORD: {} } }));
vi.mock('@/lib/api/middlewares', () => ({
  pipe: () => (handler: (ctx: unknown) => Promise<Response>) => (ctx: unknown) => handler(ctx),
  withSentry: () => {},
  withCSRF: {},
  withAuth: {},
  withRateLimit: () => {},
}));

const { POST } = await import('../route');
const call = POST as unknown as (ctx: unknown) => Promise<Response>;

const typedCurrent = 'typed-wrong-current-password';
const ctx = () => ({
  userId: 'user-1',
  req: new Request('http://localhost/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword: typedCurrent, newPassword: 'N3w-Strong-Pass!' }),
  }),
});

describe('POST /api/auth/change-password', () => {
  beforeEach(() => vi.clearAllMocks());

  // Sentry MIRRORBUDDY-4F: a mistyped current password reached the alert feed as a warning.
  it('treats a wrong current password as a user mistake, not an alarm', async () => {
    mocks.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      username: 'u',
      passwordHash: 'hash',
      disabled: false,
    });
    mocks.verifyPassword.mockResolvedValueOnce(false);

    const response = await call(ctx());

    expect(response.status).toBe(401);
    expect(mocks.log.warn).not.toHaveBeenCalled();
    expect(mocks.log.error).not.toHaveBeenCalled();
    expect(mocks.log.info).toHaveBeenCalledWith(
      'Change password attempt: invalid current password',
      { userId: 'user-1' },
    );
    expect(JSON.stringify(Object.values(mocks.log).map((fn) => fn.mock.calls))).not.toContain(
      typedCurrent,
    );
  });

  it('still warns when the authenticated account no longer exists', async () => {
    mocks.findUnique.mockResolvedValueOnce(null);

    const response = await call(ctx());

    expect(response.status).toBe(404);
    expect(mocks.log.warn).toHaveBeenCalledWith('Change password attempt: user not found', {
      userId: 'user-1',
    });
  });
});
