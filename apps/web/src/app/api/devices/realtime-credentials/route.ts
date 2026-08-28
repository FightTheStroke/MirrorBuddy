/**
 * GET /api/devices/realtime-credentials
 *
 * The paired robot fetches the Azure Realtime voice credentials at runtime,
 * authenticating with its device token (`Authorization: Bearer <token>`).
 *
 * Why this exists: the robot used to keep a long-lived Azure key in a file on
 * the hardware. Every key rotation then required someone to physically reach
 * the device and paste the new value, and a stale key silently broke the voice
 * session. Serving the credentials here means a rotation propagates on the
 * next robot start, and nothing sensitive is stored on the robot's disk.
 *
 * Read-only; no session and no CSRF — the device token is the credential.
 */
import { NextResponse } from 'next/server';
import { pipe, withSentry, withRateLimit } from '@/lib/api/middlewares';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { getDeviceProfile } from '@/lib/devices/device-service';

export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' } as const;

function cleaned(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export const GET = pipe(
  withSentry('/api/devices/realtime-credentials'),
  withRateLimit(RATE_LIMITS.DEVICE_ME),
)(async (ctx) => {
  const header = ctx.req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'Missing device token' }, { status: 401, headers: NO_STORE });
  }

  const profile = await getDeviceProfile(token);
  if (!profile) {
    return NextResponse.json({ error: 'Invalid device token' }, { status: 401, headers: NO_STORE });
  }

  const endpoint = cleaned('AZURE_OPENAI_REALTIME_ENDPOINT');
  const apiKey = cleaned('AZURE_OPENAI_REALTIME_API_KEY');
  // Same preference order as the web voice session: the robot and the browser
  // must talk to the same model, or a child hears two different tutors.
  const deployment =
    cleaned('AZURE_OPENAI_REALTIME_DEPLOYMENT_V21') ||
    cleaned('AZURE_OPENAI_REALTIME_DEPLOYMENT_V2') ||
    cleaned('AZURE_OPENAI_REALTIME_DEPLOYMENT');
  if (!endpoint || !apiKey || !deployment) {
    return NextResponse.json(
      { error: 'Voice credentials are not configured on the server' },
      { status: 503, headers: NO_STORE },
    );
  }

  return NextResponse.json(
    {
      endpoint,
      apiKey,
      deployment,
      // Deliberately always null: an api-version switches the robot to the
      // deprecated preview realtime protocol. The robot picks the stable GA
      // protocol precisely when no version is set, so we never send one.
      apiVersion: null,
    },
    { headers: NO_STORE },
  );
});
