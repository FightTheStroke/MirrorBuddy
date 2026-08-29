// ============================================================================
// API ROUTE: Proxy SDP exchange with Azure OpenAI Realtime WebRTC
// Handles CORS issues by proxying the SDP exchange server-side
// ============================================================================

import { sanitizeUpstreamError, describeUpstreamError } from '@/lib/ai/providers/azure-errors';
import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withRateLimit } from '@/lib/api/middlewares';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { getRequestId, getRequestLogger } from '@/lib/tracing';

export const revalidate = 0;

const MAX_SDP_LENGTH = 64_000;
const MAX_TOKEN_LENGTH = 2_048;
const AZURE_REQUEST_TIMEOUT_MS = 8_000;

function getAzureRequestId(response: Response): string | undefined {
  return (
    response.headers.get('x-request-id') ??
    response.headers.get('apim-request-id') ??
    response.headers.get('x-ms-request-id') ??
    undefined
  );
}

export const POST = pipe(
  withSentry('/api/realtime/sdp-exchange'),
  withCSRF,
  withRateLimit(RATE_LIMITS.REALTIME_TOKEN),
)(async (ctx) => {
  const requestId = getRequestId(ctx.req);
  const log = getRequestLogger(ctx.req, requestId);
  const requestStartMs = Date.now();

  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch {
    const response = NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    response.headers.set('X-Request-ID', requestId);
    return response;
  }
  if (typeof body !== 'object' || body === null) {
    const response = NextResponse.json(
      { error: 'Missing required fields: sdp, token' },
      { status: 400 },
    );
    response.headers.set('X-Request-ID', requestId);
    return response;
  }
  const { sdp, token } = body as { sdp?: unknown; token?: unknown };
  if (
    typeof sdp !== 'string' ||
    !sdp.trim() ||
    typeof token !== 'string' ||
    !token.trim() ||
    !sdp.startsWith('v=0') ||
    !token.startsWith('ek_')
  ) {
    const response = NextResponse.json(
      { error: 'Missing required fields: sdp, token' },
      { status: 400 },
    );
    response.headers.set('X-Request-ID', requestId);
    return response;
  }
  if (sdp.length > MAX_SDP_LENGTH || token.length > MAX_TOKEN_LENGTH) {
    const response = NextResponse.json({ error: 'SDP request is too large' }, { status: 413 });
    response.headers.set('X-Request-ID', requestId);
    return response;
  }

  // Get Azure endpoint from environment
  const azureEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT?.trim();
  if (!azureEndpoint) {
    log.error('[SDP Proxy] Azure endpoint not configured');
    const response = NextResponse.json({ error: 'Azure endpoint not configured' }, { status: 503 });
    response.headers.set('X-Request-ID', requestId);
    return response;
  }

  const url = new URL(azureEndpoint);
  const sdpUrl = `${url.protocol}//${url.hostname}/openai/v1/realtime/calls`;

  log.debug('[SDP Proxy] Exchanging SDP with Azure', { url: sdpUrl });

  // Forward SDP offer to Azure
  const azureRequestStartMs = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AZURE_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(sdpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        Authorization: `Bearer ${token}`,
      },
      body: sdp,
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    const status = timedOut ? 504 : 502;
    log.error('[SDP Proxy] Azure SDP request failed', {
      status,
      timedOut,
      azureRequestMs: Date.now() - azureRequestStartMs,
      totalMs: Date.now() - requestStartMs,
    });
    const proxyResponse = NextResponse.json(
      { error: timedOut ? 'SDP exchange timed out' : 'SDP exchange network failure' },
      { status },
    );
    proxyResponse.headers.set('X-Request-ID', requestId);
    return proxyResponse;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    const azureRequestMs = Date.now() - azureRequestStartMs;
    const totalMs = Date.now() - requestStartMs;
    const sanitized = sanitizeUpstreamError(response.status, errorText);
    const azureRequestId = getAzureRequestId(response);
    log.error('[SDP Proxy] Azure SDP exchange failed', {
      ...sanitized,
      azureRequestId,
      azureRequestMs,
      totalMs,
    });
    const proxyResponse = NextResponse.json(
      {
        error: `SDP exchange failed: ${response.status}`,
        details: describeUpstreamError(sanitized),
      },
      { status: response.status },
    );
    proxyResponse.headers.set('X-Request-ID', requestId);
    if (azureRequestId) {
      proxyResponse.headers.set('X-Azure-Request-ID', azureRequestId);
    }
    return proxyResponse;
  }

  // Return the SDP answer
  const answerSdp = await response.text();
  const azureRequestMs = Date.now() - azureRequestStartMs;
  const totalMs = Date.now() - requestStartMs;
  log.info('Realtime sdp exchange timing', {
    endpoint: '/api/realtime/sdp-exchange',
    azureRequestMs,
    totalMs,
  });
  log.debug('[SDP Proxy] SDP exchange successful');

  const proxyResponse = new NextResponse(answerSdp, {
    status: 200,
    headers: { 'Content-Type': 'application/sdp' },
  });
  const azureRequestId = getAzureRequestId(response);
  proxyResponse.headers.set('X-Request-ID', requestId);
  if (azureRequestId) {
    proxyResponse.headers.set('X-Azure-Request-ID', azureRequestId);
  }
  proxyResponse.headers.set('Server-Timing', `azure;dur=${azureRequestMs}, total;dur=${totalMs}`);
  return proxyResponse;
});
