import 'server-only';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { COPPA_AGE_THRESHOLD } from '@/lib/compliance/coppa-service';
import { migrateConsent } from '@/lib/consent/consent-migration';
import { CONSENT_VERSION, isConsentTimestamp } from '@/lib/consent/unified-consent';

/** Optional processing is stricter than study access: unknown age cannot authorize it. */
export async function isOptionalAnalyticsEligible(
  userId: string | null | undefined,
): Promise<boolean> {
  if (typeof userId !== 'string' || !userId.trim()) return false;
  // Keep the existing age policy, but do not inherit the study helper's DB-error fallback.
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { age: true },
  });
  const age = profile?.age;
  if (typeof age !== 'number' || !Number.isInteger(age) || age < 0) return false;
  if (age >= COPPA_AGE_THRESHOLD) return true;
  const guardian = await prisma.coppaConsent.findUnique({
    where: { userId },
    select: { consentGranted: true },
  });
  return guardian?.consentGranted === true;
}

function isKnownAge(age: unknown): age is number {
  return typeof age === 'number' && Number.isInteger(age) && age >= 0;
}

/**
 * Same policy as isOptionalAnalyticsEligible for a page of users, in one
 * Profile query and at most one guardian-consent query (#1159).
 */
export async function filterOptionalAnalyticsEligible(
  userIds: readonly (string | null | undefined)[],
): Promise<Set<string>> {
  const ids = [
    ...new Set(userIds.filter((id): id is string => typeof id === 'string' && !!id.trim())),
  ];
  const eligible = new Set<string>();
  if (ids.length === 0) return eligible;
  const profiles = await prisma.profile.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, age: true },
  });
  const minors: string[] = [];
  for (const profile of Array.isArray(profiles) ? profiles : []) {
    if (!profile?.userId || !isKnownAge(profile.age)) continue;
    if (profile.age >= COPPA_AGE_THRESHOLD) eligible.add(profile.userId);
    else minors.push(profile.userId);
  }
  if (minors.length === 0) return eligible;
  const consents = await prisma.coppaConsent.findMany({
    where: { userId: { in: minors }, consentGranted: true },
    select: { userId: true },
  });
  for (const consent of Array.isArray(consents) ? consents : []) {
    if (consent?.userId) eligible.add(consent.userId);
  }
  return eligible;
}

/** No browser flag, locale, profile-view permission or cached grant authorizes ingestion. */
export async function canCollectOptionalAnalytics(
  userId: string | null | undefined,
): Promise<boolean> {
  if (typeof userId !== 'string' || !userId.trim()) return false;
  const settings = await prisma.settings.findUnique({
    where: { userId },
    select: { azureCostConfig: true },
  });
  if (!hasStoredAnalyticsOptIn(settings?.azureCostConfig)) return false;
  return isOptionalAnalyticsEligible(userId);
}

export function hasStoredAnalyticsOptIn(config: unknown): boolean {
  if (typeof config !== 'string') return false;
  let envelope: unknown;
  try {
    envelope = JSON.parse(config);
  } catch {
    logger.warn('Optional analytics denied: invalid stored consent JSON');
    return false;
  }
  const { consent, issues } = migrateConsent({ serverCookies: envelope });
  if (issues.length) logger.warn('Optional analytics consent rejected', { issues });
  return (
    consent?.cookies.analytics === true &&
    consent.cookies.version === CONSENT_VERSION &&
    isConsentTimestamp(consent.cookies.acceptedAt)
  );
}

export function optionalAnalyticsDenied(): NextResponse {
  return NextResponse.json(
    { error: 'Optional analytics not permitted', code: 'OPTIONAL_ANALYTICS_DENIED' },
    { status: 403 },
  );
}
