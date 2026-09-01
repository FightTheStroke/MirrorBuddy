/**
 * @file azure-stream-request.ts
 * @brief Deployment/parameter compatibility for the Azure streaming call
 *
 * Extracted from azure-streaming.ts: the streaming path has to survive the same
 * three upstream refusals the non-streaming path does — an unknown deployment,
 * a refused token parameter, and a refused temperature — before the SSE reader
 * ever starts.
 */

import { logger } from '@/lib/logger';
import { type TokenParamName, sanitizeUpstreamError } from './azure-errors';

export type StreamRequestOptions = {
  endpointUrl: (deployment: string) => string;
  apiKey: string;
  body: Record<string, unknown>;
  temperature: number;
  maxTokens: number;
  deployment: string;
  fallbackDeployment?: string;
  signal?: AbortSignal;
};

/** A consumed error response, replayable once by the caller's error handling. */
function replayable(status: number, errorText: string): Response {
  return {
    ok: false,
    status,
    text: async () => errorText,
    body: null,
  } as unknown as Response;
}

export async function fetchStreamWithCompatibility(
  options: StreamRequestOptions,
): Promise<Response> {
  const { endpointUrl, apiKey, body, temperature, maxTokens, deployment, signal } = options;
  const fallbackDeployment =
    options.fallbackDeployment && options.fallbackDeployment !== deployment
      ? options.fallbackDeployment
      : undefined;

  // GPT-5 class deployments accept only their default temperature. Once refused,
  // it stays dropped for every later attempt.
  let includeTemperature = true;

  const attempts: Array<{ deployment: string; tokenParamName: TokenParamName }> = [
    { deployment, tokenParamName: 'max_completion_tokens' },
    ...(fallbackDeployment
      ? [{ deployment: fallbackDeployment, tokenParamName: 'max_completion_tokens' as const }]
      : []),
    { deployment, tokenParamName: 'max_tokens' },
    ...(fallbackDeployment
      ? [{ deployment: fallbackDeployment, tokenParamName: 'max_tokens' as const }]
      : []),
  ];

  async function doFetch(target: string, tokenParamName: TokenParamName): Promise<Response> {
    return fetch(endpointUrl(target), {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        ...(includeTemperature ? { temperature } : {}),
        [tokenParamName]: maxTokens,
      }),
      signal,
    });
  }

  let lastFailure: Response | null = null;

  attemptLoop: for (const attempt of attempts) {
    // Inner loop only re-runs the SAME attempt after temperature is dropped.
    for (;;) {
      const response = await doFetch(attempt.deployment, attempt.tokenParamName);
      if (response.ok) return response;

      const errorText = await response.text();
      const sanitized = sanitizeUpstreamError(response.status, errorText);
      logger.error(`[Azure Streaming] Error ${response.status}`, {
        deployment: attempt.deployment,
        tokenParamName: attempt.tokenParamName,
        ...sanitized,
      });
      lastFailure = replayable(response.status, errorText);

      if (sanitized.unsupportedTemperature && includeTemperature) {
        includeTemperature = false;
        logger.warn(
          '[Azure Streaming] Deployment rejects a custom temperature; using its default',
          {
            deployment: attempt.deployment,
          },
        );
        continue;
      }

      if (sanitized.category === 'deployment_not_found' || sanitized.tokenParam) {
        continue attemptLoop;
      }

      return lastFailure;
    }
  }

  return lastFailure ?? replayable(500, '{"error":{"code":"no_attempt"}}');
}
