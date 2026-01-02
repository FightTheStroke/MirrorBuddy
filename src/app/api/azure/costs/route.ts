// ============================================================================
// API ROUTE: Azure Cost Management
// Queries Azure Cost Management API for subscription costs
// Supports: Service Principal (production) OR az CLI credentials (local dev)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { logger } from '@/lib/logger';

// Default subscription for ConvergioEdu
const DEFAULT_SUBSCRIPTION_ID = '8015083b-adad-42ff-922d-feaed61c5d62';

interface CostByService {
  serviceName: string;
  cost: number;
  currency: string;
}

interface DailyCost {
  date: string;
  cost: number;
}

interface CostSummary {
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  totalCost: number;
  currency: string;
  costsByService: CostByService[];
  dailyCosts: DailyCost[];
  source: 'service_principal' | 'az_cli';
}

interface CostForecast {
  subscriptionId: string;
  forecastPeriodEnd: string;
  estimatedTotal: number;
  currency: string;
  source: 'service_principal' | 'az_cli';
}

// Simple in-memory cache
const cache = new Map<string, { timestamp: number; data: unknown }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { timestamp: Date.now(), data });
}

// ============================================================================
// SERVICE PRINCIPAL AUTH (Production)
// ============================================================================

function hasServicePrincipalCredentials(): boolean {
  return !!(
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET
  );
}

async function getAzureToken(): Promise<string | null> {
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

async function queryCostsWithToken(
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

// ============================================================================
// AZ CLI AUTH (Local Development)
// ============================================================================

function isAzCliAvailable(): boolean {
  try {
    execSync('az account show', { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function queryCostsWithAzCli(
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

// ============================================================================
// UNIFIED QUERY FUNCTION
// ============================================================================

async function queryCosts(
  subscriptionId: string,
  queryBody: Record<string, unknown>
): Promise<{ result: Record<string, unknown> | null; source: 'service_principal' | 'az_cli' }> {
  // Try service principal first (production)
  if (hasServicePrincipalCredentials()) {
    const token = await getAzureToken();
    if (token) {
      const result = await queryCostsWithToken(token, subscriptionId, queryBody);
      return { result, source: 'service_principal' };
    }
  }

  // Fallback to az CLI (local dev)
  if (isAzCliAvailable()) {
    const result = queryCostsWithAzCli(subscriptionId, queryBody);
    return { result, source: 'az_cli' };
  }

  return { result: null, source: 'az_cli' };
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID || DEFAULT_SUBSCRIPTION_ID;

  // Check if any auth method is available
  if (!hasServicePrincipalCredentials() && !isAzCliAvailable()) {
    return NextResponse.json(
      {
        error: 'Azure authentication not configured',
        hint: 'Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET or run "az login"',
        configured: false,
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');
  const type = searchParams.get('type') || 'summary';

  // Check cache
  const cacheKey = `costs_${type}_${days}`;
  const cached = getCached<CostSummary | CostForecast>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    if (type === 'forecast') {
      const today = new Date();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const query = {
        type: 'ActualCost',
        timeframe: 'MonthToDate',
        dataset: {
          granularity: 'None',
          aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
        },
      };

      const { result, source } = await queryCosts(subscriptionId, query);
      if (!result) {
        return NextResponse.json({ error: 'Failed to query costs' }, { status: 500 });
      }

      const rows = (result.properties as { rows?: unknown[][] })?.rows || [];
      const currentCost = (rows[0]?.[0] as number) || 0;
      const daysElapsed = today.getDate();
      const daysInMonth = endOfMonth.getDate();
      const estimatedTotal = daysElapsed > 0 ? (currentCost / daysElapsed) * daysInMonth : 0;

      const forecast: CostForecast = {
        subscriptionId,
        forecastPeriodEnd: endOfMonth.toISOString().split('T')[0],
        estimatedTotal: Math.round(estimatedTotal * 100) / 100,
        currency: 'USD',
        source,
      };

      setCache(cacheKey, forecast);
      return NextResponse.json(forecast);
    }

    // Summary query
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const serviceQuery = {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
      },
      dataset: {
        granularity: 'None',
        aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
        grouping: [{ type: 'Dimension', name: 'ServiceName' }],
      },
    };

    const dailyQuery = {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
      },
      dataset: {
        granularity: 'Daily',
        aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
      },
    };

    const [serviceResponse, dailyResponse] = await Promise.all([
      queryCosts(subscriptionId, serviceQuery),
      queryCosts(subscriptionId, dailyQuery),
    ]);

    if (!serviceResponse.result || !dailyResponse.result) {
      return NextResponse.json({ error: 'Failed to query costs' }, { status: 500 });
    }

    // Parse service costs
    const serviceRows = (serviceResponse.result.properties as { rows?: unknown[][] })?.rows || [];
    const costsByService: CostByService[] = [];
    let totalCost = 0;

    for (const row of serviceRows) {
      const cost = row[0] as number;
      const serviceName = row[1] as string;
      const currency = (row[2] as string) || 'USD';
      costsByService.push({ serviceName, cost, currency });
      totalCost += cost;
    }

    costsByService.sort((a, b) => b.cost - a.cost);

    // Parse daily costs
    const dailyRows = (dailyResponse.result.properties as { rows?: unknown[][] })?.rows || [];
    const dailyCosts: DailyCost[] = [];

    for (const row of dailyRows) {
      const cost = row[0] as number;
      const dateVal = row[1];
      let dateStr: string;
      if (typeof dateVal === 'number') {
        const d = String(dateVal);
        dateStr = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
      } else {
        dateStr = String(dateVal).slice(0, 10);
      }
      dailyCosts.push({ date: dateStr, cost });
    }

    dailyCosts.sort((a, b) => a.date.localeCompare(b.date));

    const summary: CostSummary = {
      subscriptionId,
      periodStart: startDate.toISOString().split('T')[0],
      periodEnd: endDate.toISOString().split('T')[0],
      totalCost: Math.round(totalCost * 100) / 100,
      currency: 'USD',
      costsByService,
      dailyCosts,
      source: serviceResponse.source,
    };

    setCache(cacheKey, summary);
    return NextResponse.json(summary);
  } catch (error) {
    logger.error('Azure costs API error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to fetch Azure costs' }, { status: 500 });
  }
}
