/**
 * GET /api/realtime/voice-status
 *
 * Admin-only endpoint that reports which Azure Realtime env vars are configured.
 * Never exposes the API key. Endpoint is redacted to the first 30 characters.
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';

const REQUIRED_VARS = [
  'AZURE_OPENAI_REALTIME_API_KEY',
  'AZURE_OPENAI_REALTIME_ENDPOINT',
  'AZURE_OPENAI_REALTIME_REGION',
  'AZURE_OPENAI_REALTIME_DEPLOYMENT',
  'AZURE_OPENAI_REALTIME_API_VERSION',
] as const;

const REDACT_LENGTH = 30;

function redactEndpoint(value: string | undefined): string | null {
  if (!value) return null;
  return value.length > REDACT_LENGTH ? `${value.slice(0, REDACT_LENGTH)}...` : value;
}

export const GET = pipe(
  withSentry('/api/realtime/voice-status'),
  withAdmin,
)(async () => {
  const missingVars = REQUIRED_VARS.filter((v) => !process.env[v]);

  return NextResponse.json({
    configured: missingVars.length === 0,
    missingVars,
    endpoint: redactEndpoint(process.env.AZURE_OPENAI_REALTIME_ENDPOINT),
    region: process.env.AZURE_OPENAI_REALTIME_REGION ?? null,
    deployment: process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT ?? null,
    liveCheck: 'skipped',
  });
});
