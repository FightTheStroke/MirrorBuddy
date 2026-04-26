import { NextResponse } from 'next/server';
import { pipe, withSentry, withRateLimit } from '@/lib/api/middlewares';
import { signup } from '@/lib/waitlist/waitlist-service';
import { logger } from '@/lib/logger';

export const revalidate = 0;

const log = logger.child({ module: 'api/waitlist/signup' });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WAITLIST_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
};

interface SignupBody {
  email: unknown;
  name?: unknown;
  locale?: unknown;
  gdprConsent: unknown;
  marketingConsent?: unknown;
}

// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- public waitlist endpoint, no auth needed, uses rate limiting
export const POST = pipe(
  withSentry('/api/waitlist/signup'),
  withRateLimit(WAITLIST_RATE_LIMIT),
)(async (ctx) => {
  let body: SignupBody;

  try {
    body = (await ctx.req.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, name, locale, gdprConsent, marketingConsent } = body;

  // Validate email
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
  }

  // Validate gdprConsent — must be explicitly true
  if (gdprConsent !== true) {
    return NextResponse.json(
      { error: 'GDPR consent is required to join the waitlist' },
      { status: 400 },
    );
  }

  // Coerce optional fields
  const resolvedName = typeof name === 'string' && name.trim() ? name.trim() : undefined;
  const resolvedLocale = typeof locale === 'string' && locale.trim() ? locale.trim() : 'it';
  const resolvedMarketing = marketingConsent === true;

  try {
    const entry = await signup({
      email: email.trim(),
      name: resolvedName,
      locale: resolvedLocale,
      gdprConsentVersion: '1.0',
      marketingConsent: resolvedMarketing,
      source: 'coming-soon',
    });

    log.info('Waitlist signup via API', { email: email.trim() });

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully joined the waitlist. Please check your email to verify.',
        id: entry.id,
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes('already registered')) {
      return NextResponse.json(
        { error: 'This email address is already on the waitlist' },
        { status: 409 },
      );
    }

    if (message.includes('Invalid email')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    log.error('Waitlist signup error', { error: message });
    return NextResponse.json(
      { error: 'Failed to join waitlist. Please try again.' },
      { status: 500 },
    );
  }
});
