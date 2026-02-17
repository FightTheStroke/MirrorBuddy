/**
 * Waitlist Service
 * Handles signup, email verification, unsubscribe, and stats for the pre-launch waitlist.
 */

import { customAlphabet } from 'nanoid';
import { prisma } from '@/lib/db';
import { recordFunnelEvent } from '@/lib/funnel';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'waitlist-service' });

// Lazy import — T1-05 creates this file in parallel
const loadWaitlistTemplates = () => import('@/lib/email/templates/waitlist-templates');

const generatePromoCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SignupParams {
  email: string;
  name?: string;
  locale: string;
  gdprConsentVersion: string;
  marketingConsent?: boolean;
  source?: string;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  locale: string;
  source: string;
  gdprConsentAt: Date;
  gdprConsentVersion: string;
  marketingConsent: boolean;
  marketingConsentAt: Date | null;
  verificationToken: string;
  verificationExpiresAt: Date;
  verifiedAt: Date | null;
  unsubscribeToken: string;
  unsubscribedAt: Date | null;
  promoCode: string | null;
  promoRedeemedAt: Date | null;
  convertedUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaitlistStats {
  total: number;
  verified: number;
  unsubscribed: number;
  converted: number;
}

function validateEmail(email: string): void {
  if (!email || !EMAIL_REGEX.test(email.trim())) {
    throw new Error('Invalid email address');
  }
}

async function sendVerificationEmail(
  entry: Pick<WaitlistEntry, 'email' | 'name' | 'verificationToken'>,
  locale: string,
): Promise<void> {
  try {
    const templates = await loadWaitlistTemplates();
    const template = templates.getVerificationTemplate({
      email: entry.email,
      name: entry.name ?? undefined,
      verificationToken: entry.verificationToken,
      locale,
    });
    const result = await sendEmail(template);
    if (!result.success) {
      log.warn('Verification email failed to send', { email: entry.email, error: result.error });
    }
  } catch (err) {
    log.error('Error sending verification email', {
      email: entry.email,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function sendConfirmationEmail(
  entry: Pick<WaitlistEntry, 'email' | 'name' | 'promoCode'>,
  locale: string,
): Promise<void> {
  try {
    const templates = await loadWaitlistTemplates();
    const template = templates.getVerifiedTemplate({
      email: entry.email,
      name: entry.name ?? undefined,
      promoCode: entry.promoCode ?? undefined,
      locale,
    });
    const result = await sendEmail(template);
    if (!result.success) {
      log.warn('Confirmation email failed to send', { email: entry.email, error: result.error });
    }
  } catch (err) {
    log.error('Error sending confirmation email', {
      email: entry.email,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Register a new waitlist signup.
 * Validates input, checks for duplicates, creates entry, sends verification email,
 * and records the WAITLIST_SIGNUP funnel event.
 */
export async function signup(params: SignupParams): Promise<WaitlistEntry> {
  const email = params.email.trim().toLowerCase();
  validateEmail(email);

  if (!params.gdprConsentVersion?.trim()) {
    throw new Error('GDPR consent version is required');
  }

  const existing = await prisma.waitlistEntry.findUnique({ where: { email } });
  if (existing) {
    throw new Error('Email already registered on waitlist');
  }

  const now = new Date();
  const entry = (await prisma.waitlistEntry.create({
    data: {
      email,
      name: params.name?.trim() || null,
      locale: params.locale,
      source: params.source ?? 'coming-soon',
      gdprConsentAt: now,
      gdprConsentVersion: params.gdprConsentVersion,
      marketingConsent: params.marketingConsent ?? false,
      marketingConsentAt: params.marketingConsent ? now : null,
      verificationExpiresAt: new Date(now.getTime() + VERIFICATION_EXPIRY_MS),
    },
  })) as unknown as WaitlistEntry;

  await Promise.allSettled([
    recordFunnelEvent({
      stage: 'WAITLIST_SIGNUP',
      locale: params.locale,
      metadata: { email, source: params.source ?? 'coming-soon' },
    }),
    sendVerificationEmail(entry, params.locale),
  ]);

  log.info('Waitlist signup created', { email });
  return entry;
}

/**
 * Verify an email address using the verification token.
 * Sets verifiedAt, generates a promo code, sends confirmation email,
 * and records the WAITLIST_VERIFIED funnel event.
 */
export async function verify(token: string): Promise<WaitlistEntry> {
  const entry = (await prisma.waitlistEntry.findUnique({
    where: { verificationToken: token },
  })) as unknown as WaitlistEntry | null;

  if (!entry) {
    throw new Error('Invalid verification token');
  }
  if (entry.verifiedAt) {
    throw new Error('Email already verified');
  }
  if (entry.verificationExpiresAt < new Date()) {
    throw new Error('Verification token expired');
  }

  const promoCode = generatePromoCode();
  const updated = (await prisma.waitlistEntry.update({
    where: { verificationToken: token },
    data: {
      verifiedAt: new Date(),
      promoCode,
    },
  })) as unknown as WaitlistEntry;

  await Promise.allSettled([
    recordFunnelEvent({
      stage: 'WAITLIST_VERIFIED',
      locale: entry.locale,
      metadata: { email: entry.email },
    }),
    sendConfirmationEmail({ ...updated, name: entry.name }, entry.locale),
  ]);

  log.info('Waitlist entry verified', { email: entry.email });
  return updated;
}

/**
 * Unsubscribe from the waitlist using the unsubscribe token.
 * Sets unsubscribedAt. Idempotent — safe to call multiple times.
 */
export async function unsubscribe(token: string): Promise<WaitlistEntry> {
  const entry = (await prisma.waitlistEntry.findUnique({
    where: { unsubscribeToken: token },
  })) as unknown as WaitlistEntry | null;

  if (!entry) {
    throw new Error('Invalid unsubscribe token');
  }

  const updated = (await prisma.waitlistEntry.update({
    where: { unsubscribeToken: token },
    data: {
      unsubscribedAt: entry.unsubscribedAt ?? new Date(),
    },
  })) as unknown as WaitlistEntry;

  log.info('Waitlist entry unsubscribed', { email: entry.email });
  return updated;
}

/**
 * Look up a waitlist entry by email address.
 */
export async function getByEmail(email: string): Promise<WaitlistEntry | null> {
  return prisma.waitlistEntry.findUnique({
    where: { email: email.trim().toLowerCase() },
  }) as unknown as WaitlistEntry | null;
}

/**
 * Get aggregate waitlist statistics grouped by status.
 */
export async function getStats(): Promise<WaitlistStats> {
  const [total, verified, unsubscribed, converted] = await Promise.all([
    prisma.waitlistEntry.count(),
    prisma.waitlistEntry.count({ where: { verifiedAt: { not: null } } }),
    prisma.waitlistEntry.count({ where: { unsubscribedAt: { not: null } } }),
    prisma.waitlistEntry.count({ where: { promoRedeemedAt: { not: null } } }),
  ]);

  return { total, verified, unsubscribed, converted };
}
