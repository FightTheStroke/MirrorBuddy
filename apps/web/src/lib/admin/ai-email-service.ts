/**
 * AI/Email Monitoring Service
 * Fetches metrics from Azure OpenAI, Sentry, and Resend
 */

import { logger } from '@/lib/logger';
import type {
  AIEmailMetrics,
  AzureOpenAIMetrics,
  SentryMetrics,
  ResendMetrics,
} from './ai-email-types';

// 30-second cache
let cachedMetrics: AIEmailMetrics | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

async function fetchAzureOpenAIMetrics(): Promise<AzureOpenAIMetrics | null> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-4';

  if (!apiKey || !endpoint) {
    logger.warn('AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT not configured');
    return null;
  }

  try {
    const base = endpoint.replace(/\/+$/, '');
    const usageUrl = `${base}/openai/deployments/${deployment}/usage?api-version=2024-02-01`;

    const res = await fetch(usageUrl, {
      headers: { 'api-key': apiKey },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      const tokensUsed: number = data.total_tokens ?? data.tokens_used ?? 0;
      const rpm: number = data.requests_per_minute ?? 0;
      return {
        status: 'healthy',
        tokensUsed,
        tokensLimit: data.tokens_limit ?? 300_000,
        requestsPerMinute: rpm,
        rpmLimit: data.rpm_limit ?? 60,
        estimatedCostUsd: Math.round(tokensUsed * 0.00001 * 100) / 100,
        model: deployment,
      };
    }

    // Fallback: lightweight reachability check
    const healthRes = await fetch(
      `${base}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`,
      {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
        signal: AbortSignal.timeout(5000),
      },
    );

    return {
      status: healthRes.ok ? 'healthy' : 'degraded',
      tokensUsed: 0,
      tokensLimit: 300_000,
      requestsPerMinute: 0,
      rpmLimit: 60,
      estimatedCostUsd: 0,
      model: deployment,
    };
  } catch (error) {
    logger.error('Failed to fetch Azure OpenAI metrics', undefined, error);
    return null;
  }
}

async function fetchSentryMetrics(): Promise<SentryMetrics | null> {
  const authToken = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;

  if (!authToken || !org || !project) {
    logger.warn('SENTRY_AUTH_TOKEN, SENTRY_ORG, or SENTRY_PROJECT not configured');
    return null;
  }

  try {
    const headers = { Authorization: `Bearer ${authToken}` };
    const baseUrl = `https://sentry.io/api/0/projects/${org}/${project}`;

    const [projectRes, issuesRes] = await Promise.all([
      fetch(`${baseUrl}/`, { headers, signal: AbortSignal.timeout(5000) }),
      fetch(`${baseUrl}/issues/?query=is:unresolved`, {
        headers,
        signal: AbortSignal.timeout(5000),
      }),
    ]);

    if (!projectRes.ok) {
      return { status: 'degraded', unresolvedIssues: 0, eventsToday: 0, eventsLimit: 0 };
    }

    const projectData = await projectRes.json();
    const unresolvedIssues = issuesRes.ok ? ((await issuesRes.json()) as unknown[]).length : 0;

    return {
      status: 'healthy',
      unresolvedIssues,
      eventsToday: projectData.stats?.['24h']?.[1] ?? 0,
      eventsLimit: projectData.quotas?.maxRate ?? 10_000,
    };
  } catch (error) {
    logger.error('Failed to fetch Sentry metrics', undefined, error);
    return null;
  }
}

async function fetchResendMetrics(): Promise<ResendMetrics | null> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    logger.warn('RESEND_API_KEY not configured');
    return null;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return {
        status: 'degraded',
        emailsSentToday: 0,
        emailsLimit: 0,
        bounceRate: 0,
        lastSentAt: null,
      };
    }

    const data = await res.json();
    const emails: Array<{ created_at?: string; status?: string }> = data.data ?? data ?? [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEmails = emails.filter((e) => e.created_at && new Date(e.created_at) >= todayStart);
    const bounced = todayEmails.filter((e) => e.status === 'bounced').length;
    const bounceRate =
      todayEmails.length > 0 ? Math.round((bounced / todayEmails.length) * 10000) / 10000 : 0;
    const lastSentAt = emails[0]?.created_at ?? null;

    return {
      status: 'healthy',
      emailsSentToday: todayEmails.length,
      emailsLimit: 3000,
      bounceRate,
      lastSentAt,
    };
  } catch (error) {
    logger.error('Failed to fetch Resend metrics', undefined, error);
    return null;
  }
}

export async function getAIEmailMetrics(): Promise<AIEmailMetrics> {
  const now = Date.now();

  if (cachedMetrics && now - lastFetchTime < CACHE_TTL) {
    return cachedMetrics;
  }

  const results = await Promise.allSettled([
    fetchAzureOpenAIMetrics(),
    fetchSentryMetrics(),
    fetchResendMetrics(),
  ]);

  const metrics: AIEmailMetrics = {
    azureOpenAI: results[0].status === 'fulfilled' ? results[0].value : null,
    sentry: results[1].status === 'fulfilled' ? results[1].value : null,
    resend: results[2].status === 'fulfilled' ? results[2].value : null,
  };

  cachedMetrics = metrics;
  lastFetchTime = now;

  return metrics;
}
