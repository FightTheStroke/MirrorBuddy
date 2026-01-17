// ============================================================================
// API ROUTE: Get ephemeral token for Azure OpenAI Realtime WebRTC
// Calls Azure REST API to create a session and return ephemeral token
// SECURITY: API key is NEVER exposed to client
// NOTE: Each request creates a unique session - no caching to prevent
//       multiple clients sharing the same session (security/privacy issue)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

interface AzureSessionResponse {
  client_secret: {
    value: string;
    expires_at: number;
  };
  id: string;
}

interface EphemeralTokenResponse {
  token: string;
  expiresAt: number;
  sessionId: string;
}

// Per-IP rate limit tracker: clientId -> last request timestamp (ms)
const rateLimitTracker = new Map<string, number>();

/**
 * Check per-IP rate limit: 1 request per second maximum
 * Returns true if request is allowed, false if rate limited
 */
function checkPerIPRateLimit(clientId: string): boolean {
  const nowMs = Date.now();
  const lastRequestMs = rateLimitTracker.get(clientId);

  if (!lastRequestMs) {
    rateLimitTracker.set(clientId, nowMs);
    return true;
  }

  const timeSinceLastMs = nowMs - lastRequestMs;
  if (timeSinceLastMs < 1000) {
    // Less than 1 second since last request
    return false;
  }

  rateLimitTracker.set(clientId, nowMs);
  return true;
}

export async function POST(request: NextRequest) {
  // Get client identifier for rate limiting and caching
  const clientId = getClientIdentifier(request);

  // Per-IP rate limit: 1 request per second maximum
  if (!checkPerIPRateLimit(clientId)) {
    logger.warn('Per-IP rate limit exceeded (1 req/sec)', {
      clientId,
      endpoint: '/api/realtime/ephemeral-token',
    });
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Maximum 1 request per second per IP',
      },
      { status: 429 }
    );
  }

  // Azure OpenAI Realtime configuration (required)
  const azureEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
  const azureDeployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;

  // Rate limiting: 30 requests per minute per IP (global rate limit)
  const rateLimit = await checkRateLimitAsync(
    `realtime-ephemeral-token:${clientId}`,
    RATE_LIMITS.REALTIME_TOKEN
  );

  if (!rateLimit.success) {
    logger.warn('Global rate limit exceeded (30 req/min)', {
      clientId,
      endpoint: '/api/realtime/ephemeral-token',
    });
    return rateLimitResponse(rateLimit);
  }

  // Get API key (needed for new token request)
  const azureApiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY;

  // Validate Azure configuration
  const missingConfig: string[] = [];
  if (!azureEndpoint) missingConfig.push('AZURE_OPENAI_REALTIME_ENDPOINT');
  if (!azureApiKey) missingConfig.push('AZURE_OPENAI_REALTIME_API_KEY');
  if (!azureDeployment) missingConfig.push('AZURE_OPENAI_REALTIME_DEPLOYMENT');

  if (missingConfig.length > 0 || !azureEndpoint || !azureApiKey || !azureDeployment) {
    logger.error('Azure OpenAI Realtime not configured', { missingConfig });
    return NextResponse.json(
      {
        error: 'Azure OpenAI not configured',
        missingVariables: missingConfig,
        message: 'Configure Azure OpenAI settings in the app or add environment variables',
      },
      { status: 503 }
    );
  }

  // Ensure azureEndpoint is defined for TypeScript
  if (!azureEndpoint) {
    return NextResponse.json({ error: 'Azure endpoint not configured' }, { status: 503 });
  }

  try {
    // Call Azure REST API to create ephemeral session
    // POST https://{endpoint}/openai/realtimeapi/sessions?api-version=2025-04-01-preview
    const url = new URL(azureEndpoint);
    const azureUrl = `${url.protocol}//${url.hostname}/openai/realtimeapi/sessions?api-version=2025-04-01-preview`;

    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'api-key': azureApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: azureDeployment,
      }),
    });

    // Handle Azure API errors
    if (!response.ok) {
      const errorData = await response.text();
      logger.error('Azure ephemeral token request failed', {
        status: response.status,
        error: errorData,
      });

      return NextResponse.json(
        {
          error: 'Failed to get ephemeral token from Azure',
          status: response.status,
        },
        { status: response.status >= 500 ? 503 : 400 }
      );
    }

    const sessionData: AzureSessionResponse = await response.json();

    // Extract ephemeral token details
    const { client_secret, id: sessionId } = sessionData;
    if (!client_secret || !client_secret.value || !client_secret.expires_at) {
      logger.error('Invalid Azure session response - missing client_secret', {
        sessionData,
      });

      return NextResponse.json(
        {
          error: 'Invalid response from Azure - missing ephemeral token',
        },
        { status: 503 }
      );
    }

    // Return ephemeral token to client (unique session per request)
    const payload: EphemeralTokenResponse = {
      token: client_secret.value,
      expiresAt: client_secret.expires_at,
      sessionId: sessionId || '',
    };

    logger.info('Ephemeral token issued (unique session)', {
      clientId,
      sessionId,
      expiresAt: client_secret.expires_at,
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    logger.error('Unexpected error in ephemeral token endpoint', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to get ephemeral token',
      },
      { status: 500 }
    );
  }
}
