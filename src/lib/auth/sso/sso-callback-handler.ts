// ============================================================================
// SSO CALLBACK HANDLER
// Shared logic for processing SSO callbacks from any OIDC provider
// Created for F-04: School Admin SSO Integration
// ============================================================================

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { hashPII } from '@/lib/security';
import type { OIDCUserInfo } from './oidc-provider';

export interface SSOCallbackResult {
  userId: string;
  isNewUser: boolean;
  redirectUrl: string;
}

/**
 * Find school by SSO domain
 */
async function findSchoolByDomain(
  domain: string,
  provider: 'google' | 'microsoft',
): Promise<{ schoolId: string } | null> {
  const config = await prisma.schoolSSOConfig.findFirst({
    where: {
      domain,
      provider,
      enabled: true,
    },
    select: { schoolId: true },
  });
  return config;
}

/**
 * Process SSO callback: create or link user, assign school and role
 */
export async function handleSSOCallback(
  userInfo: OIDCUserInfo,
  provider: 'google' | 'microsoft',
): Promise<SSOCallbackResult> {
  const email = userInfo.email.toLowerCase();
  const domain = email.split('@')[1];

  logger.info('[SSO] Processing callback', {
    provider,
    email: email.slice(0, 3) + '***',
    domain,
  });

  // Find user by emailHash (PII-encrypted) or plain email (legacy)
  const emailHash = await hashPII(email);
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ emailHash }, { email }],
    },
  });

  if (existingUser) {
    logger.info('[SSO] Linked existing user', {
      userId: existingUser.id,
      provider,
    });
    return {
      userId: existingUser.id,
      isNewUser: false,
      redirectUrl: '/dashboard',
    };
  }

  // Find school association
  const school = await findSchoolByDomain(domain, provider);

  // Create new user
  const newUser = await prisma.user.create({
    data: {
      email,
      username: email,
      role: 'USER',
      profile: {
        create: {
          name:
            userInfo.name ||
            `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim() ||
            email.split('@')[0],
        },
      },
    },
  });

  logger.info('[SSO] Created new user', {
    userId: newUser.id,
    provider,
    schoolId: school?.schoolId,
    role: 'USER',
  });

  return {
    userId: newUser.id,
    isNewUser: true,
    redirectUrl: '/welcome',
  };
}
