import { cookies } from 'next/headers';
import { validateAuth, type AuthResult } from '@/lib/auth/session-auth';
import { AuthenticationError } from '@/lib/auth/auth-error';
import { revokeSession } from '@/lib/auth/session-revocation';
import { clearSessionCookies } from '@/lib/auth/session-cookies';
import { pipe, withSentry, withCSRF } from '@/lib/api/middlewares';

export const revalidate = 0;
export const POST = pipe(
  withSentry('/api/auth/logout'),
  withCSRF,
)(async (ctx) => {
  const text = await ctx.req.text();
  let body: unknown = {};
  try {
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return Response.json({ error: 'Invalid logout request' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return Response.json({ error: 'Invalid logout request' }, { status: 400 });
  const scope = 'scope' in body ? body.scope : 'current';
  if (scope !== 'current' && scope !== 'all')
    return Response.json({ error: 'Invalid logout scope' }, { status: 400 });
  let auth: AuthResult;
  try {
    auth = await validateAuth();
  } catch (error) {
    if (
      scope !== 'current' ||
      !(error instanceof AuthenticationError) ||
      error.code !== 'SESSION_REJECTED'
    )
      throw error;
    clearSessionCookies(await cookies());
    return Response.json({ success: true });
  }
  // A later revocation race must still fail; recovery requires a fresh credential read.
  if (auth.authenticated) await revokeSession(auth.session, scope);
  else if (scope === 'all')
    return Response.json(
      { error: 'Authentication required', code: 'AUTH_ABSENT' },
      { status: 401 },
    );
  clearSessionCookies(await cookies());
  return Response.json({ success: true });
});
