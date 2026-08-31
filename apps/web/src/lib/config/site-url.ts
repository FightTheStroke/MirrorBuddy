/**
 * Single source of truth for the public site URL and the email sender identity.
 *
 * Before this module every consumer invented its own fallback, producing five
 * different domains in production (mirrorbuddy.app, mirrorbuddy.it,
 * mirrorbuddy.com, mirrorbuddy.vercel.app and literal "undefined"). Only
 * www.mirrorbuddy.org resolves, and only mirrorbuddy.org is verified in Resend,
 * so both constants below are the canonical values.
 */

/** The one public address of the product. Everything else is a redirect. */
export const CANONICAL_SITE_URL = 'https://www.mirrorbuddy.org';

/** The only domain verified for outbound email in Resend. */
export const EMAIL_SENDER_DOMAIN = 'mirrorbuddy.org';

/** Default transactional sender, used when a caller has no specific mailbox. */
export const DEFAULT_EMAIL_FROM = `MirrorBuddy <noreply@${EMAIL_SENDER_DOMAIN}>`;

const LOCAL_SITE_URL = 'http://localhost:3000';

function normalize(url: string): string {
  const trimmed = url.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function isUsable(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim() !== 'undefined';
}

/**
 * Resolve the absolute base URL for links rendered into pages and emails.
 *
 * Order: explicit build-time configuration wins; otherwise production falls back
 * to the canonical domain and local development falls back to localhost, so a
 * missing variable can never again ship a dead domain to users.
 */
export function getSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
  ];

  for (const candidate of candidates) {
    if (isUsable(candidate)) {
      return normalize(candidate);
    }
  }

  return process.env.NODE_ENV === 'production' ? CANONICAL_SITE_URL : LOCAL_SITE_URL;
}

/**
 * Build an absolute URL from a site-relative path.
 *
 * @param path - Site-relative path, with or without a leading slash.
 */
export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  if (!isUsable(path)) {
    return base;
  }
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

/**
 * Sender address for transactional email.
 *
 * @param mailbox - Local part of the address, e.g. "noreply" or "support".
 * @param displayName - Human-readable name shown in the recipient's inbox.
 */
export function getEmailFrom(mailbox = 'noreply', displayName = 'MirrorBuddy'): string {
  const safeMailbox = isUsable(mailbox) ? mailbox.trim() : 'noreply';
  return `${displayName} <${safeMailbox}@${EMAIL_SENDER_DOMAIN}>`;
}
