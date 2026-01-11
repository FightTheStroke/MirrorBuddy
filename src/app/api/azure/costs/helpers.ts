/**
 * Azure Cost Management helpers
 */

import { execSync } from 'child_process';
import { logger } from '@/lib/logger';

// Simple in-memory cache
const cache = new Map<string, { timestamp: number; data: unknown }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

export function setCache(key: string, data: unknown): void {
  cache.set(key, { timestamp: Date.now(), data });
}

/**
 * Check if service principal credentials are available
 */
export function hasServicePrincipalCredentials(): boolean {
  return !!(
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET
  );
}

/**
 * Get Azure token using service principal credentials
 */
export async function getAzureToken(): Promise<string | null> {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    return null;
  }

  const cachedToken = getCached<string>('azure_token');
  if (cachedToken) return cachedToken;

  try {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://management.azure.com/.default',
      }),
    });

    if (!response.ok) {
      logger.error('Azure token error', { response: await response.text() });
      return null;
    }

    const data = await response.json();
    setCache('azure_token', data.access_token);
    return data.access_token;
  } catch (error) {
    logger.error('Azure token fetch error', { error: String(error) });
    return null;
  }
}

/**
 * Query costs using service principal token
 */
export async function queryCostsWithToken(
  token: string,
  subscriptionId: string,
  queryBody: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryBody),
    });

    if (response.status === 429) {
      return null;
    }

    if (!response.ok) {
      logger.error('Azure Cost API error', { response: await response.text() });
      return null;
    }

    return response.json();
  } catch (error) {
    logger.error('Azure Cost query error', { error: String(error) });
    return null;
  }
}

/**
 * Check if az CLI is available
 */
export function isAzCliAvailable(): boolean {
  try {
    execSync('az account show', { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Query costs using az CLI
 */
export function queryCostsWithAzCli(
  subscriptionId: string,
  queryBody: Record<string, unknown>
): Record<string, unknown> | null {
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`;

  try {
    const bodyJson = JSON.stringify(queryBody).replace(/"/g, '\\"');
    const cmd = `az rest --method post --url "${url}" --body "${bodyJson}" -o json`;
    const result = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
    return JSON.parse(result);
  } catch (error) {
    logger.error('az CLI cost query error', { error: String(error) });
    return null;
  }
}

/**
 * Unified query function - tries service principal first, falls back to az CLI
 */
export async function queryCosts(
  subscriptionId: string,
  queryBody: Record<string, unknown>
): Promise<{ result: Record<string, unknown> | null; source: 'service_principal' | 'az_cli' }> {
  if (hasServicePrincipalCredentials()) {
    const token = await getAzureToken();
    if (token) {
      const result = await queryCostsWithToken(token, subscriptionId, queryBody);
      return { result, source: 'service_principal' };
    }
  }

  if (isAzCliAvailable()) {
    const result = queryCostsWithAzCli(subscriptionId, queryBody);
    return { result, source: 'az_cli' };
  }

  return { result: null, source: 'az_cli' };
}
