/**
 * MIRRORBUDDY - Consent API
 *
 * Stores user consent preferences in the database.
 * Backup for localStorage, also enables server-side consent checks.
 *
 * Plan 052: Trial mode consent system
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateAuth } from '@/lib/auth/server';
import { pipe, withSentry, withCSRF } from '@/lib/api/middlewares';
import { cookieConsentSchema } from '@/lib/consent/unified-consent';
import { z } from 'zod';
import { canCollectOptionalAnalytics } from '@/lib/telemetry/optional-analytics-server';

export const revalidate = 0;
const log = logger.child({ module: 'api/user/consent' });

const configSchema = z.record(z.string(), z.unknown());

export const POST = pipe(
  withSentry('/api/user/consent'),
  withCSRF,
)(async (ctx) => {
  // Use proper auth validation (handles signed cookies correctly)
  const auth = await validateAuth();
  const userId = auth.authenticated ? auth.userId : null;

  // Parse consent data
  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return NextResponse.json({ error: 'Invalid consent data' }, { status: 400 });
  }
  const parsed = cookieConsentSchema.strict().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid consent data' }, { status: 400 });
  }
  const consent = parsed.data;
  let persisted = false;

  // If user is authenticated, store in database
  if (userId) {
    const settings = await prisma.settings.findUnique({
      where: { userId },
      select: { azureCostConfig: true },
    });
    const config = settings?.azureCostConfig
      ? configSchema.parse(JSON.parse(settings.azureCostConfig))
      : {};
    await prisma.user.update({
      where: { id: userId },
      data: {
        settings: {
          upsert: {
            create: {
              // Store consent as part of azure cost config (JSON field)
              azureCostConfig: JSON.stringify({ ...config, consent }),
            },
            update: {
              azureCostConfig: JSON.stringify({ ...config, consent }),
            },
          },
        },
      },
    });
    persisted = true;

    log.info('Consent saved to database', {
      userId,
      analytics: consent.analytics,
    });
  }

  // Log consent event for analytics
  log.info('Consent recorded', {
    userId: userId || 'anonymous',
    version: consent.version,
    analytics: consent.analytics,
    marketing: consent.marketing,
  });

  const analyticsAllowed =
    !!userId && consent.analytics && (await canCollectOptionalAnalytics(userId));
  return NextResponse.json({
    success: true,
    consent,
    persisted,
    analyticsAllowed,
  });
});

export const GET = pipe(withSentry('/api/user/consent'))(async () => {
  // Use proper auth validation (handles signed cookies correctly)
  const auth = await validateAuth();
  const userId = auth.authenticated ? auth.userId : null;

  if (!userId) {
    return NextResponse.json({ consent: null, analyticsAllowed: false });
  }

  const settings = await prisma.settings.findUnique({
    where: { userId },
    select: { azureCostConfig: true },
  });

  if (!settings?.azureCostConfig) {
    return NextResponse.json({ consent: null, analyticsAllowed: false });
  }

  try {
    const config = configSchema.parse(JSON.parse(settings.azureCostConfig));
    const consent = config.consent == null ? null : cookieConsentSchema.parse(config.consent);
    const analyticsAllowed =
      consent?.analytics === true && (await canCollectOptionalAnalytics(userId));
    return NextResponse.json({ consent, analyticsAllowed });
  } catch (error) {
    if (!(error instanceof SyntaxError) && !(error instanceof z.ZodError)) throw error;
    log.warn('Stored consent is malformed');
    return NextResponse.json({ error: 'Invalid stored consent' }, { status: 500 });
  }
});
