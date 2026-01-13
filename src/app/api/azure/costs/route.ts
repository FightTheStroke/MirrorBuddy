/**
 * API ROUTE: Azure Cost Management
 * Queries Azure Cost Management API for subscription costs
 * Supports: Service Principal (production) OR az CLI credentials (local dev)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { CostSummary, CostForecast, CostByService, DailyCost } from './types';
import {
  getCached,
  setCache,
  hasServicePrincipalCredentials,
  isAzCliAvailable,
  queryCosts,
} from './helpers';

// Default subscription for MirrorBuddy
const DEFAULT_SUBSCRIPTION_ID = '8015083b-adad-42ff-922d-feaed61c5d62';

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

    // Parse service costs with explicit typing
    const serviceRows: unknown[][] = (serviceResponse.result.properties as { rows?: unknown[][] })?.rows || [];
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

    // Parse daily costs with explicit typing
    const dailyRows: unknown[][] = (dailyResponse.result.properties as { rows?: unknown[][] })?.rows || [];
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
