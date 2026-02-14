// ============================================================================
// API ROUTE: Proxy SDP exchange with Azure OpenAI Realtime WebRTC
// Handles CORS issues by proxying the SDP exchange server-side
// ============================================================================

import { NextResponse } from 'next/server';
import { pipe, withSentry } from '@/lib/api/middlewares';
import { getRequestId, getRequestLogger } from '@/lib/tracing';

// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- WebRTC proxy, uses ephemeral bearer token, no cookie auth

export const revalidate = 0;
export const POST = pipe(withSentry('/api/realtime/sdp-exchange'))(async (ctx) => {
  const requestId = getRequestId(ctx.req);
  const log = getRequestLogger(ctx.req, requestId);
  const requestStartMs = Date.now();

  const body = await ctx.req.json();
  const { sdp, token } = body;

  if (!sdp || !token) {
    const response = NextResponse.json(
      { error: 'Missing required fields: sdp, token' },
      { status: 400 },
    );
    response.headers.set('X-Request-ID', requestId);
    return response;
  }

  // Get Azure endpoint from environment
  const azureEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
  if (!azureEndpoint) {
    log.error('[SDP Proxy] Azure endpoint not configured');
    const response = NextResponse.json({ error: 'Azure endpoint not configured' }, { status: 503 });
    response.headers.set('X-Request-ID', requestId);
    return response;
  }

  // Construct the WebRTC SDP exchange URL
  const url = new URL(azureEndpoint);
  const sdpUrl = `${url.protocol}//${url.hostname}/openai/v1/realtime/calls?webrtcfilter=on`;

  log.debug('[SDP Proxy] Exchanging SDP with Azure', { url: sdpUrl });

  // Forward SDP offer to Azure
  const azureRequestStartMs = Date.now();
  const response = await fetch(sdpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sdp',
      Authorization: `Bearer ${token}`,
    },
    body: sdp,
  });

  if (!response.ok) {
    const errorText = await response.text();
    const azureRequestMs = Date.now() - azureRequestStartMs;
    const totalMs = Date.now() - requestStartMs;
    log.error('[SDP Proxy] Azure SDP exchange failed', {
      status: response.status,
      errorDetails: errorText,
      azureRequestMs,
      totalMs,
    });
    const proxyResponse = NextResponse.json(
      {
        error: `SDP exchange failed: ${response.status}`,
        details: errorText,
      },
      { status: response.status },
    );
    proxyResponse.headers.set('X-Request-ID', requestId);
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
  proxyResponse.headers.set('X-Request-ID', requestId);
  proxyResponse.headers.set('Server-Timing', `azure;dur=${azureRequestMs}, total;dur=${totalMs}`);
  return proxyResponse;
});
