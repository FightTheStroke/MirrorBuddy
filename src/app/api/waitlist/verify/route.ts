import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pipe, withSentry, withRateLimit } from '@/lib/api/middlewares';
import { verify } from '@/lib/waitlist/waitlist-service';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'waitlist-verify-api' });

/** 10 requests per IP per hour — public link-from-email endpoint */
const VERIFY_RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 60 * 1000 };

/**
 * GET /api/waitlist/verify?token=<token>
 *
 * Verifies an email from the waitlist using the token sent in the verification email.
 * No auth required — this is a public link-from-email endpoint.
 * Redirects to /{locale}/waitlist/verify?status=success|expired|already|not_found.
 */
export const GET = pipe(
  withSentry('/api/waitlist/verify'),
  withRateLimit(VERIFY_RATE_LIMIT),
)(async (ctx) => {
  const url = new URL(ctx.req.url);
  const token = url.searchParams.get('token');

  if (!token || typeof token !== 'string' || token.trim() === '') {
    return NextResponse.redirect(new URL('/waitlist/verify?status=not_found', url.origin));
  }

  const cleanToken = token.trim();

  try {
    const entry = await verify(cleanToken);
    const locale = entry.locale ?? 'it';
    log.info('Waitlist entry verified via link', { locale });
    return NextResponse.redirect(new URL(`/${locale}/waitlist/verify?status=success`, url.origin));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Attempt to look up the entry's locale for a better redirect experience
    let entryLocale = 'it';
    try {
      const existing = await prisma.waitlistEntry.findUnique({
        where: { verificationToken: cleanToken },
        select: { locale: true },
      });
      if (existing?.locale) entryLocale = existing.locale;
    } catch {
      // Ignore — fall back to default locale
    }

    if (message.includes('already verified') || message.includes('already')) {
      log.info('Waitlist verify: already verified', { locale: entryLocale });
      return NextResponse.redirect(
        new URL(`/${entryLocale}/waitlist/verify?status=already`, url.origin),
      );
    }

    if (message.includes('expired')) {
      log.info('Waitlist verify: token expired', { locale: entryLocale });
      return NextResponse.redirect(
        new URL(`/${entryLocale}/waitlist/verify?status=expired`, url.origin),
      );
    }

    // Invalid / not found token
    log.info('Waitlist verify: token not found');
    return NextResponse.redirect(new URL('/waitlist/verify?status=not_found', url.origin));
  }
});
