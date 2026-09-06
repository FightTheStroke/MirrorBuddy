import { vi } from 'vitest';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

export const analyticsConsentFixture = {
  version: '1.0',
  acceptedAt: '2026-09-05T10:00:00.000Z',
  essential: true,
  analytics: true,
  marketing: false,
};

/** Real stored contract with a known eligible age; Prisma remains the external boundary. */
export function permitOptionalAnalytics() {
  vi.mocked(prisma.settings.findUnique, { partial: true }).mockResolvedValue({
    azureCostConfig: JSON.stringify({ consent: analyticsConsentFixture }),
  });
  vi.mocked(prisma.profile.findUnique, { partial: true }).mockResolvedValue({ age: 18 });
}

export class AnalyticsRequest extends NextRequest {
  constructor(input: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
    const headers = new Headers(init?.headers);
    headers.set('cookie', 'csrf-token=csrf');
    headers.set('x-csrf-token', 'csrf');
    super(input, { ...init, headers });
  }
}
