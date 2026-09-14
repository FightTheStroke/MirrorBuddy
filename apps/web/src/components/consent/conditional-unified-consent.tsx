'use client';

import { usePathname } from 'next/navigation';
import { useClientIdentity } from '@/lib/auth/identity-provider';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { UnifiedConsentWall } from './unified-consent-wall';

const PUBLIC_PATHS = [
  '/welcome',
  '/landing',
  '/login',
  '/change-password',
  '/invite',
  '/privacy',
  '/cookies',
  '/terms',
  '/ai-transparency',
  '/legal/data-request',
];

export function ConditionalUnifiedConsent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const identity = useClientIdentity();
  const { hasCompletedOnboarding } = useOnboardingStore();
  const segments = pathname?.split('/').filter(Boolean) ?? [];
  const hasLocalePrefix = ['it', 'en', 'fr', 'de', 'es'].includes(segments[0]);
  const normalizedPathname = hasLocalePrefix ? `/${segments.slice(1).join('/')}` : (pathname ?? '');
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => normalizedPathname === path || normalizedPathname.startsWith(`${path}/`),
  );

  // An unhydrated store cannot exempt a signed-in user or hide identity recovery.
  const awaitingOnboarding = identity.status !== 'authenticated' && !hasCompletedOnboarding;
  if (isPublicPath || awaitingOnboarding) {
    return <>{children}</>;
  }

  return <UnifiedConsentWall>{children}</UnifiedConsentWall>;
}
