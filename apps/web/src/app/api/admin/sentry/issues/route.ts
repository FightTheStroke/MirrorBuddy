/**
 * Sentry Issues API Endpoint
 *
 * Fetches recent issues from Sentry for admin dashboard display.
 * Requires SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT env vars.
 *
 * @see ADR 0070 - Sentry Error Tracking Integration
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';
import { logger } from '@/lib/logger';

export const revalidate = 0;
const SENTRY_API_BASE = 'https://sentry.io/api/0';

interface SentryIssue {
  id: string;
  shortId: string;
  title: string;
  culprit: string;
  permalink: string;
  firstSeen: string;
  lastSeen: string;
  count: string;
  userCount: number;
  level: 'error' | 'warning' | 'info' | 'fatal';
  status: 'resolved' | 'unresolved' | 'ignored';
  isUnhandled: boolean;
  metadata: {
    type?: string;
    value?: string;
    filename?: string;
  };
}

interface SentryIssueResponse {
  issues: SentryIssue[];
  total: number;
  hasMore: boolean;
}

export const GET = pipe(
  withSentry('/api/admin/sentry/issues'),
  withAdminReadOnly,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 25);
  const query = searchParams.get('query') || 'is:unresolved';

  // Check required env vars
  const authToken = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;

  if (!authToken || !org || !project) {
    return NextResponse.json(
      {
        error: 'Sentry not configured',
        issues: [],
        total: 0,
        hasMore: false,
      },
      { status: 200 },
    );
  }

  try {
    const url = `${SENTRY_API_BASE}/projects/${org}/${project}/issues/?query=${encodeURIComponent(query)}&limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Sentry API error response', {
        component: 'sentry-issues',
        status: response.status,
        errorText,
      });
      return NextResponse.json(
        { error: 'Failed to fetch Sentry issues', issues: [], total: 0 },
        { status: 200 },
      );
    }

    const issues: SentryIssue[] = await response.json();
    const linkHeader = response.headers.get('link');
    const hasMore = linkHeader?.includes('rel="next"') || false;

    const result: SentryIssueResponse = {
      issues: issues.map((issue) => ({
        id: issue.id,
        shortId: issue.shortId,
        title: issue.title,
        culprit: issue.culprit,
        permalink: issue.permalink,
        firstSeen: issue.firstSeen,
        lastSeen: issue.lastSeen,
        count: issue.count,
        userCount: issue.userCount,
        level: issue.level,
        status: issue.status,
        isUnhandled: issue.isUnhandled,
        metadata: issue.metadata || {},
      })),
      total: issues.length,
      hasMore,
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Sentry API request failed', { component: 'sentry-issues' }, error);
    return NextResponse.json(
      { error: 'Sentry API request failed', issues: [], total: 0 },
      { status: 200 },
    );
  }
});
