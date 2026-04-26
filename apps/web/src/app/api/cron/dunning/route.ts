/**
 * Dunning Cron Job
 * Runs daily to:
 * 1. Send reminder emails (day 3, day 7)
 * 2. Downgrade expired grace periods
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { pipe, withCron, withSentry } from '@/lib/api/middlewares';
import { dunningService } from '@/lib/stripe/dunning-service';
import { logger } from '@/lib/logger';

export const GET = pipe(
  withSentry('/api/cron/dunning'),
  withCron,
)(async () => {
  try {
    await dunningService.sendDunningReminders();
    await dunningService.processGracePeriodExpired();

    logger.info('Dunning cron completed successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Dunning cron failed', undefined, error);
    return NextResponse.json({ error: 'Dunning cron execution failed' }, { status: 500 });
  }
});
