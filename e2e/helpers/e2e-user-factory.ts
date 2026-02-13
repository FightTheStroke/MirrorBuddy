/**
 * @file e2e-user-factory.ts
 * @brief Creates E2E test users in the database (ADR 0081)
 *
 * Extracted from global-setup.ts to keep file under 250 lines
 * and enable reuse across test setups.
 */

import { randomUUID } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import { seedTiers } from '../../src/lib/seeds/tier-seed';

export interface E2ETestUser {
  testUserId: string;
  randomSuffix: string;
}

/**
 * Create a test user with onboarding, ToS, profile, and settings.
 * All test data is marked with isTestData=true for cleanup.
 */
export async function createE2ETestUser(prisma: PrismaClient): Promise<E2ETestUser> {
  const randomSuffix = randomUUID().replace(/-/g, '').substring(0, 9);
  const testUserId = `e2e-test-user-${Date.now()}-${randomSuffix}`;

  // Ensure critical reference data exists for E2E (e.g. Base tier assignment).
  await seedTiers(prisma);

  await prisma.user.upsert({
    where: { id: testUserId },
    update: {},
    create: {
      id: testUserId,
      email: `e2e-test-${randomSuffix}@example.com`,
      username: `e2e_test_${randomSuffix}`,
      isTestData: true,
      role: 'USER',
      disabled: false,
      profile: {
        create: {
          name: 'E2E Test User',
          age: 12,
        },
      },
      settings: {
        create: {},
      },
      // ADR 0059: /api/onboarding checks OnboardingState, not localStorage
      onboarding: {
        create: {
          hasCompletedOnboarding: true,
          onboardingCompletedAt: new Date(),
          currentStep: 'ready',
          isReplayMode: false,
          data: JSON.stringify({
            name: 'E2E Test User',
            age: 12,
            schoolLevel: 'media',
            learningDifferences: [],
            gender: 'other',
          }),
        },
      },
      // F-13: ToS acceptance to bypass consent wall
      tosAcceptances: {
        create: {
          version: '1.0',
          acceptedAt: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'Playwright E2E Test',
        },
      },
    },
  });

  return { testUserId, randomSuffix };
}
