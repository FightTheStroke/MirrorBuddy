/**
 * External Service Health Checks
 * Azure OpenAI, Resend, and Sentry connectivity checks
 */

import type { ServiceHealth } from './health-aggregator-types';
import { fetchWithTimeout, buildHealthResponse } from './health-checks-utils';

/**
 * Check Azure OpenAI availability
 */
export async function checkAzureOpenAI(): Promise<ServiceHealth> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const configured = !!endpoint;

  if (!endpoint || !apiKey) {
    return buildHealthResponse('Azure OpenAI', 'unknown', configured, undefined, 'Not configured');
  }

  const start = Date.now();
  try {
    const url = `${endpoint}/openai/models?api-version=2024-02-01`;
    const response = await fetchWithTimeout(url, { 'api-key': apiKey });
    const responseTimeMs = Date.now() - start;
    const status = response.ok ? 'healthy' : 'degraded';
    const details = response.ok ? 'Connected' : `HTTP ${response.status}`;
    return buildHealthResponse('Azure OpenAI', status, configured, responseTimeMs, details);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Connection failed';
    return buildHealthResponse('Azure OpenAI', 'down', configured, Date.now() - start, details);
  }
}

/**
 * Check Resend email service
 */
export async function checkResend(): Promise<ServiceHealth> {
  const apiKey = process.env.RESEND_API_KEY;
  const configured = !!apiKey;

  if (!apiKey) {
    return buildHealthResponse('Resend', 'unknown', configured, undefined, 'Not configured');
  }

  const start = Date.now();
  try {
    const response = await fetchWithTimeout('https://api.resend.com/domains', {
      Authorization: `Bearer ${apiKey}`,
    });
    const responseTimeMs = Date.now() - start;

    // A restricted (send-only) key gets 401 on /domains but is still valid
    if (response.status === 401) {
      const body = await response.json().catch(() => null);
      const isRestricted =
        body && typeof body === 'object' && 'name' in body && body.name === 'restricted_api_key';
      if (isRestricted) {
        return buildHealthResponse(
          'Resend',
          'healthy',
          configured,
          responseTimeMs,
          'Connected (send-only key)',
        );
      }
      return buildHealthResponse(
        'Resend',
        'down',
        configured,
        responseTimeMs,
        'API key invalid - check RESEND_API_KEY in environment',
      );
    }

    if (response.status === 403) {
      return buildHealthResponse(
        'Resend',
        'down',
        configured,
        responseTimeMs,
        'API key lacks required permissions',
      );
    }

    const status = response.ok ? 'healthy' : 'degraded';
    const details = response.ok ? 'Connected' : `HTTP ${response.status}`;
    return buildHealthResponse('Resend', status, configured, responseTimeMs, details);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Connection failed';
    return buildHealthResponse('Resend', 'down', configured, Date.now() - start, details);
  }
}

/**
 * Check Sentry error tracking
 */
export async function checkSentry(): Promise<ServiceHealth> {
  const authToken = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;
  const configured = !!(authToken && org && project);

  if (!configured) {
    return buildHealthResponse('Sentry', 'unknown', configured, undefined, 'Not configured');
  }

  const start = Date.now();
  try {
    const url = `https://sentry.io/api/0/projects/${org}/${project}/`;
    const response = await fetchWithTimeout(url, {
      Authorization: `Bearer ${authToken}`,
    });
    const responseTimeMs = Date.now() - start;
    const status = response.ok ? 'healthy' : 'degraded';
    const details = response.ok ? 'Connected' : `HTTP ${response.status}`;
    return buildHealthResponse('Sentry', status, configured, responseTimeMs, details);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Connection failed';
    return buildHealthResponse('Sentry', 'down', configured, Date.now() - start, details);
  }
}
