// ============================================================================
// API ROUTE: Provide Azure OpenAI Realtime connection info
// Returns proxy WebSocket URL - API key stays server-side
// SECURITY: API key is NEVER exposed to client
// ============================================================================

import { NextResponse } from 'next/server';
import { pipe, withSentry } from '@/lib/api/middlewares';
import {
  checkRateLimitAsync,
  getClientIdentifier,
  RATE_LIMITS,
  rateLimitResponse,
} from '@/lib/rate-limit';
import { getRequestLogger, getRequestId } from '@/lib/tracing';
import { isFeatureEnabled } from '@/lib/feature-flags/feature-flags-service';
import { resolveRealtimeDeployment } from '@/lib/ai/realtime-deployment';

// WebSocket proxy port (must match instrumentation.ts)

export const revalidate = 0;

export const GET = pipe(withSentry('/api/realtime/token'))(async (ctx) => {
  const log = getRequestLogger(ctx.req);
  // Rate limiting: 10 requests per minute per IP
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = await checkRateLimitAsync(
    `realtime-token:${clientId}`,
    RATE_LIMITS.REALTIME_TOKEN,
  );

  if (!rateLimit.success) {
    log.warn('Rate limit exceeded', {
      clientId,
      endpoint: '/api/realtime/token',
    });
    return rateLimitResponse(rateLimit);
  }
  // Check if v1.5 / v2 models are enabled via feature flag
  const useV15 = isFeatureEnabled('voice_realtime_15')?.enabled ?? false;
  // ADR 0165: voice_realtime_2 takes precedence over V15.
  const useV2 = isFeatureEnabled('voice_realtime_2')?.enabled ?? false;
  // ADR 0169: voice_realtime_21 takes precedence over V2.
  const useV21 = isFeatureEnabled('voice_realtime_21')?.enabled ?? false;

  // Azure OpenAI Realtime configuration (required)
  // Use .trim() to handle env vars with trailing whitespace/newlines
  const azureEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT?.trim();
  const azureApiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY?.trim();
  const azureDeployment = resolveRealtimeDeployment({ useV15, useV2, useV21 });

  // Validate Azure configuration
  const missingConfig: string[] = [];
  if (!azureEndpoint) missingConfig.push('AZURE_OPENAI_REALTIME_ENDPOINT');
  if (!azureApiKey) missingConfig.push('AZURE_OPENAI_REALTIME_API_KEY');
  if (!azureDeployment) missingConfig.push('AZURE_OPENAI_REALTIME_DEPLOYMENT');

  if (missingConfig.length > 0 || !azureEndpoint || !azureApiKey || !azureDeployment) {
    const response = NextResponse.json(
      {
        error: 'Azure OpenAI not configured',
        missingVariables: missingConfig,
        message: 'Configure Azure OpenAI settings in the app or add environment variables',
      },
      { status: 503 },
    );
    response.headers.set('X-Request-ID', getRequestId(ctx.req));
    return response;
  }

  // WebRTC is the only transport. The WebSocket proxy it used to fall back to
  // was deleted, so an environment asking for `websocket` would have pointed a
  // child's browser at a port nothing listens on.
  const transport = 'webrtc' as const;

  // Check if GA protocol is enabled
  const useGAProtocol = isFeatureEnabled('voice_ga_protocol').enabled;

  // Extract resource name from endpoint for GA protocol
  // Example: https://my-resource.openai.azure.com -> my-resource
  const azureResource = azureEndpoint.match(/https:\/\/([^.]+)\./)?.[1] || '';

  // Return connection info based on transport mode
  // SECURITY: apiKey is NEVER included - stays server-side
  const response = NextResponse.json({
    provider: 'azure',
    transport,
    endpoint: azureEndpoint.replace(/\/$/, ''), // For session creation
    // GA protocol: provide resource name for deterministic endpoint
    // Preview: provide full webrtcEndpoint URL
    ...(useGAProtocol
      ? {
          azureResource,
          deployment: azureDeployment,
        }
      : {
          // Preview fallback keeps a fixed regional host while GA is the default protocol.
          // CRITICAL: model parameter is REQUIRED by Azure WebRTC endpoint
          webrtcEndpoint: `https://swedencentral.realtimeapi-preview.ai.azure.com/v1/realtimertc?model=${encodeURIComponent(azureDeployment)}`,
          deployment: azureDeployment,
        }),
    configured: true,
  });
  response.headers.set('X-Request-ID', getRequestId(ctx.req));
  return response;
});

// Check configuration status (for settings page)
export const HEAD = pipe(withSentry('/api/realtime/token'))(async () => {
  const azureEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
  const azureApiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY;
  const azureDeployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;

  if (!azureEndpoint || !azureApiKey || !azureDeployment) {
    return new NextResponse(null, { status: 503 });
  }
  return new NextResponse(null, { status: 200 });
});
