import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withRateLimit } from '@/lib/api/middlewares';
import { redeemCode } from '@/lib/promo/promo-service';
import { validateAuth } from '@/lib/auth/server';
import { logAdminAction } from '@/lib/admin/audit-service';
import { checkRateLimitAsync, getRateLimitIdentifier, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const revalidate = 0;

const log = logger.child({ module: 'api/promo/redeem' });

const PROMO_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
};

interface RedeemBody {
  code: unknown;
}

export const POST = pipe(
  withSentry('/api/promo/redeem'),
  withCSRF,
  withRateLimit(PROMO_RATE_LIMIT),
)(async (ctx) => {
  // Explicit rate limit check (allows direct testing via checkRateLimitAsync mock)
  const identifier = getRateLimitIdentifier(ctx.req, ctx.userId);
  const rateLimitResult = await checkRateLimitAsync(identifier, PROMO_RATE_LIMIT);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  // Auth check — withAuth not used in pipe since test mocks validateAuth directly
  const auth = await validateAuth();

  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = auth.userId;

  let body: RedeemBody;

  try {
    body = (await ctx.req.json()) as RedeemBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { code } = body;

  if (!code || typeof code !== 'string' || !code.trim()) {
    return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
  }

  const trimmedCode = code.trim();

  try {
    const result = await redeemCode(trimmedCode, userId);

    log.info('Promo code redeemed', { userId, code: trimmedCode });

    await logAdminAction({
      action: 'REDEEM_PROMO_CODE',
      entityType: 'PromoCode',
      entityId: trimmedCode,
      adminId: userId,
    });

    return NextResponse.json({ success: true, subscription: result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message === 'PROMO_ALREADY_REDEEMED') {
      return NextResponse.json({ error: 'Promo code has already been redeemed' }, { status: 400 });
    }

    if (message === 'PROMO_NOT_FOUND' || message === 'PROMO_TIER_NOT_FOUND') {
      return NextResponse.json({ error: 'Invalid or unknown promo code' }, { status: 400 });
    }

    if (message === 'PROMO_STRIPE_CONFLICT') {
      return NextResponse.json(
        { error: 'Cannot apply promo code with existing subscription' },
        { status: 409 },
      );
    }

    log.error('Promo code redemption error', { error: message, userId });
    return NextResponse.json(
      { error: 'Failed to redeem promo code. Please try again.' },
      { status: 500 },
    );
  }
});
