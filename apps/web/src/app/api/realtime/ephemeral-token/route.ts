// ============================================================================
// API ROUTE: Get ephemeral token for Azure OpenAI Realtime WebRTC
// Supports both GA (session.type=realtime) and preview protocols
// SECURITY: API key is NEVER exposed to client
// ============================================================================

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF } from '@/lib/api/middlewares';
import {
  checkRateLimitAsync,
  getClientIdentifier,
  RATE_LIMITS,
  rateLimitResponse,
} from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { getRequestId, getRequestLogger } from '@/lib/tracing';
import { isFeatureEnabled } from '@/lib/feature-flags/feature-flags-service';
import {
  type AzureGAResponse,
  type AzurePreviewResponse,
  buildGAPayload,
  buildPreviewPayload,
  parseGAResponse,
  parsePreviewResponse,
} from './payload-builders';

export const revalidate = 0;

// Per-IP burst window: track recent request timestamps per client.
// Allows up to PER_IP_MAX_BURST requests within PER_IP_BURST_WINDOW_MS.
// Global RATE_LIMITS.REALTIME_TOKEN (30/min) still guards sustained abuse.
//
// Was 1 req/sec fixed — too aggressive: a normal voice-session flow fires
// preloadToken() on character mount + webrtc-probe() on connectivity test +
// webrtc-connection.getToken() on user click, which can legitimately land
// within a single second. The cache layer dedupes same-hook calls but not
// cross-hook bursts.
const PER_IP_BURST_WINDOW_MS = 1000;
const PER_IP_MAX_BURST = 5;
const rateLimitTracker = new Map<string, number[]>();

function checkPerIPRateLimit(clientId: string): boolean {
  const nowMs = Date.now();
  const prior = rateLimitTracker.get(clientId) ?? [];
  const recent = prior.filter((ts) => nowMs - ts < PER_IP_BURST_WINDOW_MS);
  if (recent.length >= PER_IP_MAX_BURST) {
    rateLimitTracker.set(clientId, recent);
    return false;
  }
  recent.push(nowMs);
  rateLimitTracker.set(clientId, recent);
  return true;
}

export const POST = pipe(
  withSentry('/api/realtime/ephemeral-token'),
  withCSRF,
)(async (ctx) => {
  const requestId = getRequestId(ctx.req);
  const log = getRequestLogger(ctx.req, requestId);
  const requestStartMs = Date.now();

  const json = (body: unknown, status: number, headers?: Record<string, string>) => {
    const response = NextResponse.json(body, { status });
    response.headers.set('X-Request-ID', requestId);
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
    }
    return response;
  };

  // Get client identifier for rate limiting and caching
  const clientId = getClientIdentifier(ctx.req);

  // Per-IP rate limit: 1 request per second maximum
  if (!checkPerIPRateLimit(clientId)) {
    log.warn('Per-IP rate limit exceeded (1 req/sec)', {
      clientId,
      endpoint: '/api/realtime/ephemeral-token',
    });
    return json(
      {
        error: 'Too many requests',
        message: 'Maximum 5 requests per second per IP',
      },
      429,
    );
  }

  // Azure OpenAI Realtime configuration (required)
  // Use .trim() to handle env vars with trailing whitespace/newlines
  const azureEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT?.trim();
  const azureDeploymentLegacy = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT?.trim();
  const azureDeploymentV15 = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V15?.trim();
  // ADR 0165: gpt-realtime-2 Preview deployment — wins over V15/legacy when flag on
  const azureDeploymentV2 = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V2?.trim();
  // ADR 0169: gpt-realtime-2.1 deployment — wins over V2/V15/legacy when flag on
  const azureDeploymentV21 = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_V21?.trim();

  // Rate limiting: 30 requests per minute per IP (global rate limit)
  const rateLimit = await checkRateLimitAsync(
    `realtime-ephemeral-token:${clientId}`,
    RATE_LIMITS.REALTIME_TOKEN,
  );

  if (!rateLimit.success) {
    log.warn('Global rate limit exceeded (30 req/min)', {
      clientId,
      endpoint: '/api/realtime/ephemeral-token',
    });
    const response = rateLimitResponse(rateLimit);
    response.headers.set('X-Request-ID', requestId);
    return response;
  }

  // Get API key (needed for new token request)
  const azureApiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY?.trim();
  const useRealtime15 = await isFeatureEnabled('voice_realtime_15');
  // ADR 0165: voice_realtime_2 takes precedence over V15 and legacy.
  const useRealtime2 = await isFeatureEnabled('voice_realtime_2');
  // ADR 0169: voice_realtime_21 takes precedence over V2/V15/legacy.
  const useRealtime21 = await isFeatureEnabled('voice_realtime_21');
  const azureDeployment = useRealtime21.enabled
    ? azureDeploymentV21 || azureDeploymentV2 || azureDeploymentV15 || azureDeploymentLegacy
    : useRealtime2.enabled
      ? azureDeploymentV2 || azureDeploymentV15 || azureDeploymentLegacy
      : useRealtime15.enabled
        ? azureDeploymentV15 || azureDeploymentLegacy
        : azureDeploymentLegacy;

  // Validate Azure configuration
  const missingConfig: string[] = [];
  if (!azureEndpoint) missingConfig.push('AZURE_OPENAI_REALTIME_ENDPOINT');
  if (!azureApiKey) missingConfig.push('AZURE_OPENAI_REALTIME_API_KEY');
  if (!azureDeployment) {
    missingConfig.push(
      useRealtime21.enabled
        ? 'AZURE_OPENAI_REALTIME_DEPLOYMENT_V21'
        : useRealtime2.enabled
          ? 'AZURE_OPENAI_REALTIME_DEPLOYMENT_V2'
          : useRealtime15.enabled
            ? 'AZURE_OPENAI_REALTIME_DEPLOYMENT_V15'
            : 'AZURE_OPENAI_REALTIME_DEPLOYMENT',
    );
  }

  if (missingConfig.length > 0 || !azureEndpoint || !azureApiKey || !azureDeployment) {
    log.error('Azure OpenAI Realtime not configured', { missingConfig });
    return json(
      {
        error: 'Azure realtime credentials not configured',
        code: 'MISSING_CREDENTIALS',
        missingVariables: missingConfig,
      },
      503,
    );
  }

  // Ensure azureEndpoint is defined for TypeScript
  if (!azureEndpoint) {
    return json({ error: 'Azure endpoint not configured' }, 503);
  }

  // Parse request body for session config (GA protocol only)
  let requestBody: Record<string, unknown> = {};
  try {
    const text = await ctx.req.text();
    if (text) {
      requestBody = JSON.parse(text) as Record<string, unknown>;
    }
  } catch (error) {
    log.warn('Failed to parse request body', { error: String(error) });
  }

  // Check if GA protocol is enabled via feature flag
  // NOTE: Requires a GA-model deployment on Azure (e.g., gpt-realtime-2025-08-28).
  // If using a preview deployment (gpt-4o-realtime-preview), disable this flag.
  const useGAProtocol = await isFeatureEnabled('voice_ga_protocol');

  // Build Azure REST API URL based on feature flag
  const url = new URL(azureEndpoint);
  let azureUrl: string;

  if (useGAProtocol.enabled) {
    // GA endpoint: POST https://{resource}.openai.azure.com/openai/v1/realtime/client_secrets
    azureUrl = `${url.protocol}//${url.hostname}/openai/v1/realtime/client_secrets`;
  } else {
    // Preview endpoint: POST https://{endpoint}/openai/realtimeapi/sessions?api-version=2025-04-01-preview
    azureUrl = `${url.protocol}//${url.hostname}/openai/realtimeapi/sessions?api-version=2025-04-01-preview`;
  }

  log.info('Using realtime endpoint', {
    protocol: useGAProtocol.enabled ? 'GA' : 'preview',
    endpoint: azureUrl,
    deployment: azureDeployment,
    stack: useRealtime2.enabled
      ? 'voice_realtime_2'
      : useRealtime15.enabled
        ? 'voice_realtime_15'
        : 'voice_realtime',
  });

  // Build token request payload based on protocol version
  const tokenRequestPayload = useGAProtocol.enabled
    ? buildGAPayload(azureDeployment, requestBody)
    : buildPreviewPayload(azureDeployment);

  const azureRequestStartMs = Date.now();

  // Build headers based on protocol version
  const headers: Record<string, string> = {
    'api-key': azureApiKey,
    'Content-Type': 'application/json',
  };

  // T1-05: Add OpenAI-Beta header only for preview protocol
  if (!useGAProtocol.enabled) {
    headers['OpenAI-Beta'] = 'realtime=v1';
  }

  const response = await fetch(azureUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(tokenRequestPayload),
  });

  // Handle Azure API errors
  if (!response.ok) {
    const errorData = await response.text();
    const azureRequestMs = Date.now() - azureRequestStartMs;
    const totalMs = Date.now() - requestStartMs;
    log.error('Azure ephemeral token request failed', {
      status: response.status,
      errorDetails: errorData,
      protocol: useGAProtocol.enabled ? 'GA' : 'preview',
      deployment: azureDeployment,
      azureRequestMs,
      totalMs,
    });

    // Map Azure 401/403 (expired/invalid key) to 503 with a structured error —
    // callers must not receive a raw upstream 401 (no auth context on this endpoint).
    const outStatus =
      response.status === 401 || response.status === 403 || response.status >= 500
        ? 503
        : response.status;
    return json(
      {
        error: 'Failed to get ephemeral token from Azure',
        code: 'AZURE_ERROR',
        status: response.status,
        details: errorData.slice(0, 200),
      },
      outStatus,
    );
  }

  const azureRequestMs = Date.now() - azureRequestStartMs;
  const responseData = await response.json();

  // Parse response — GA and preview have different shapes
  const parsed = useGAProtocol.enabled
    ? parseGAResponse(responseData as AzureGAResponse)
    : parsePreviewResponse(responseData as AzurePreviewResponse);

  if (!parsed) {
    log.error('Invalid Azure response - missing token', { responseData, azureRequestMs });
    return json({ error: 'Invalid response from Azure - missing ephemeral token' }, 503);
  }

  const { expiresAt, sessionId } = parsed;

  logger.info('Ephemeral token issued (unique session)', {
    clientId,
    sessionId,
    expiresAt,
  });

  const totalMs = Date.now() - requestStartMs;
  log.info('Realtime ephemeral token timing', {
    endpoint: '/api/realtime/ephemeral-token',
    azureRequestMs,
    totalMs,
  });

  return json(parsed, 200, {
    'Server-Timing': `azure;dur=${azureRequestMs}, total;dur=${totalMs}`,
  });
});
