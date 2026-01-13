// ============================================================================
// PUSH SUBSCRIPTION API (ADR-0014)
// Manages push notification subscriptions for PWA
// ============================================================================

import { NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth/session-auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';

interface SubscriptionBody {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

// POST - Save a new push subscription
export async function POST(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`push-subscribe:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const body: SubscriptionBody = await request.json();
    const { endpoint, p256dh, auth, userAgent } = body;

    // Validate required fields
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: 'Missing required fields: endpoint, p256dh, auth' },
        { status: 400 }
      );
    }

    // Validate endpoint is a valid URL
    try {
      new URL(endpoint);
    } catch {
      return NextResponse.json(
        { error: 'Invalid endpoint URL' },
        { status: 400 }
      );
    }

    // Upsert subscription (update if exists, create if new)
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId,
        endpoint,
        p256dh,
        auth,
        userAgent,
      },
      update: {
        userId, // Update userId in case subscription was from different session
        p256dh,
        auth,
        userAgent,
      },
    });

    logger.info('Push subscription saved', {
      userId,
      subscriptionId: subscription.id,
      endpoint: endpoint.slice(0, 50) + '...',
    });

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
    }, { status: 201 });
  } catch (error) {
    logger.error('Push subscribe error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a push subscription
export async function DELETE(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`push-unsubscribe:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint' },
        { status: 400 }
      );
    }

    // Delete subscription (only if it belongs to this user)
    const result = await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId,
      },
    });

    if (result.count === 0) {
      logger.warn('Push subscription not found for deletion', { userId, endpoint: endpoint.slice(0, 50) });
      return NextResponse.json({ success: true }); // Idempotent - already deleted
    }

    logger.info('Push subscription deleted', {
      userId,
      endpoint: endpoint.slice(0, 50) + '...',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Push unsubscribe error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}

// GET - Check if user has any push subscriptions
export async function GET(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`push-check:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
      select: {
        id: true,
        userAgent: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      hasSubscriptions: subscriptions.length > 0,
      count: subscriptions.length,
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        device: parseUserAgent(s.userAgent),
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Push check error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to check subscriptions' },
      { status: 500 }
    );
  }
}

// Helper to parse user agent into friendly device name
function parseUserAgent(ua?: string | null): string {
  if (!ua) return 'Dispositivo sconosciuto';

  if (/iPad/.test(ua)) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';

  return 'Browser';
}
