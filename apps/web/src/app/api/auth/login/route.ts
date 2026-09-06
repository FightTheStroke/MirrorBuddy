import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifyPassword } from '@/lib/auth/server';
import { issuePasswordSession } from '@/lib/auth/session-issuance';
import { setSessionCookies } from '@/lib/auth/session-cookies';
import { safeReadJson } from '@/lib/api/safe-json';
import { getPresentedSessionToken } from '@/lib/auth/session-auth';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { pipe, withSentry, withRateLimit } from '@/lib/api/middlewares';
import { hashPII } from '@/lib/security';

export const revalidate = 0;
const log = logger.child({ module: 'auth/login' });

/**
 * Validate redirect URL - must be relative (start with /) to prevent open redirect
 */
function isValidRedirectUrl(url: unknown): boolean {
  if (!url) return false;
  // Only allow relative URLs starting with /
  // Prevent open redirects (e.g., https://evil.com, //evil.com, \/\/evil.com)
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//');
}

export const POST = pipe(
  withSentry('/api/auth/login'),
  withRateLimit(RATE_LIMITS.AUTH_LOGIN),
)(async (ctx) => {
  const body = await safeReadJson(ctx.req);
  if (!body || typeof body !== 'object')
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  const username = 'username' in body ? body.username : undefined;
  const email = 'email' in body ? body.email : undefined;
  const password = 'password' in body ? body.password : undefined;
  const redirect = 'redirect' in body ? body.redirect : undefined;

  // Accept either email or username (email preferred)
  const identifier = email || username;

  if (!identifier || typeof identifier !== 'string' || !password || typeof password !== 'string') {
    log.warn('Login attempt: invalid input', { identifier });
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const normalizedIdentifier = identifier.trim();
  const normalizedEmail = normalizedIdentifier.toLowerCase();
  const isEmailIdentifier = normalizedEmail.includes('@');
  const identifierHash = isEmailIdentifier ? await hashPII(normalizedEmail) : null;

  if (identifierHash) {
    // Backfill historical records that still have plain-email only, then use hash lookup only.
    await prisma.user.updateMany({
      where: { email: normalizedEmail, emailHash: null },
      data: { emailHash: identifierHash },
    });
    await prisma.googleAccount.updateMany({
      where: { email: normalizedEmail, emailHash: null },
      data: { emailHash: identifierHash },
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(identifierHash ? [{ emailHash: identifierHash }] : []),
        { username: normalizedIdentifier },
      ],
    },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      disabled: true,
      mustChangePassword: true,
      role: true,
      authVersion: true,
    },
  });

  if (!user) {
    log.warn('Login attempt: user not found', { identifier });
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  if (user.disabled) {
    log.warn('Login attempt: user disabled', { userId: user.id });
    return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
  }

  if (!user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    log.warn('Login attempt: invalid password', { userId: user.id });
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const issued = await issuePasswordSession(
    user.id,
    {
      passwordHash: user.passwordHash,
      authVersion: user.authVersion,
    },
    await getPresentedSessionToken(),
  );
  log.info('User logged in successfully', { userId: user.id });

  // Funnel: FIRST_LOGIN (non-blocking, with deduplication)
  (async () => {
    const { hasStage, recordStageTransition } = await import('@/lib/funnel');
    if (await hasStage({ userId: user.id }, 'FIRST_LOGIN')) return;
    await recordStageTransition({ userId: user.id }, 'FIRST_LOGIN', {
      source: 'password_login',
    });
  })().catch(() => log.warn('Login funnel update failed'));

  const responseData: Record<string, unknown> = {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  };

  // Include redirect in response if it's valid (relative URL starting with /)
  if (isValidRedirectUrl(redirect)) {
    responseData.redirect = redirect;
  }

  const response = NextResponse.json(responseData, { status: 200 });

  setSessionCookies(response.cookies, issued);

  return response;
});
