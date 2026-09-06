import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';
import { upgradeLegacySession } from '@/lib/auth/session-issuance';
import { setSessionCookies } from '@/lib/auth/session-cookies';

export const POST = pipe(
  withSentry('/api/auth/session/upgrade'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const result = await upgradeLegacySession(ctx.authSession);
  const response = NextResponse.json({ success: true, upgraded: result.upgraded });
  if (result.upgraded) setSessionCookies(response.cookies, result.issued);
  return response;
});
