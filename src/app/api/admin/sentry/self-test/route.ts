import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';
import { Sentry } from '@/lib/sentry';
import * as SentrySDK from '@sentry/nextjs';

interface SentrySelfTestResult {
  dsnPresent: boolean;
  vercelEnv: string | undefined;
  nodeEnv: string | undefined;
  sentryForceEnable: boolean;
  sdkEnabled: boolean;
  enabledHint: string;
  testEventId?: string;
}

export const GET = pipe(
  withSentry('/api/admin/sentry/self-test'),
  withAdmin,
)(async (_ctx) => {
  const dsnEnv = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || '';

  const isNodeProduction = process.env.NODE_ENV === 'production';
  const isForceEnabled = process.env.SENTRY_FORCE_ENABLE === 'true';

  // Check if Sentry SDK is actually initialized and enabled
  const sdkClient = SentrySDK.getClient();
  const sdkEnabled = sdkClient !== undefined;

  const enabledHint =
    dsnEnv && (isNodeProduction || isForceEnabled)
      ? 'Sentry should be enabled with current environment variables'
      : 'Sentry is likely disabled; check DSN and NODE_ENV/SENTRY_FORCE_ENABLE';

  const baseResult: SentrySelfTestResult = {
    dsnPresent: Boolean(dsnEnv),
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
    sentryForceEnable: isForceEnabled,
    sdkEnabled,
    enabledHint,
  };

  if (!dsnEnv) {
    return NextResponse.json(baseResult, { status: 200 });
  }

  // Capture a lightweight test message so the admin can verify in Sentry UI
  const testEventId = Sentry.captureMessage('mirrorbuddy-sentry-self-test', {
    level: 'info',
    tags: {
      errorType: 'self-test',
      trigger: 'admin-self-test-endpoint',
    },
  });

  return NextResponse.json(
    {
      ...baseResult,
      testEventId,
    },
    { status: 200 },
  );
});
