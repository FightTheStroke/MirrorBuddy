import { NextResponse } from 'next/server';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/server';
import { consumePasswordReset } from '@/lib/auth/session-revocation';
import { pipe, withSentry, withRateLimit } from '@/lib/api/middlewares';
import { safeReadJson } from '@/lib/api/safe-json';
import { RATE_LIMITS } from '@/lib/rate-limit';

export const revalidate = 0;
export const POST = pipe(
  withSentry('/api/auth/reset-password'),
  withRateLimit(RATE_LIMITS.AUTH_LOGIN),
)(async (ctx) => {
  const body = await safeReadJson(ctx.req);
  const token = body && typeof body === 'object' && 'token' in body ? body.token : undefined;
  const password =
    body && typeof body === 'object' && 'password' in body ? body.password : undefined;
  if (typeof token !== 'string' || !token || typeof password !== 'string' || !password)
    return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
  const validation = validatePasswordStrength(password);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Password not strong enough', details: validation.errors },
      { status: 400 },
    );
  }
  await consumePasswordReset(token, await hashPassword(password));
  return NextResponse.json({ success: true, message: 'Password reset successfully' });
});
