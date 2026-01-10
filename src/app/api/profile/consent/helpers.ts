/**
 * Profile consent helpers
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Validate POST consent request
 */
export function validateConsentInput(body: unknown): {
  valid: boolean;
  error?: string;
  data?: {
    userId: string;
    parentConsent?: boolean;
    studentConsent?: boolean;
    consentGivenBy?: string;
  };
} {
  const payload = body as Record<string, unknown>;
  const { userId, parentConsent, studentConsent, consentGivenBy } = payload;

  if (!userId) {
    return { valid: false, error: 'userId is required' };
  }

  if (parentConsent === undefined && studentConsent === undefined) {
    return {
      valid: false,
      error: 'At least one consent type (parentConsent or studentConsent) is required',
    };
  }

  return {
    valid: true,
    data: {
      userId: String(userId),
      parentConsent: parentConsent ? Boolean(parentConsent) : undefined,
      studentConsent: studentConsent ? Boolean(studentConsent) : undefined,
      consentGivenBy: consentGivenBy ? String(consentGivenBy) : undefined,
    },
  };
}

/**
 * Get or create profile and update consent
 */
export async function upsertConsentProfile(
  userId: string,
  parentConsent: boolean | undefined,
  studentConsent: boolean | undefined
) {
  let profile = await prisma.studentInsightProfile.findUnique({
    where: { userId },
  });

  const userProfile = await prisma.profile.findUnique({
    where: { userId },
  });

  if (!profile) {
    profile = await prisma.studentInsightProfile.create({
      data: {
        userId,
        studentName: userProfile?.name || 'Studente',
        parentConsent: parentConsent ?? false,
        studentConsent: studentConsent ?? false,
        consentDate: new Date(),
      },
    });
  } else {
    profile = await prisma.studentInsightProfile.update({
      where: { userId },
      data: {
        parentConsent: parentConsent ?? profile.parentConsent,
        studentConsent: studentConsent ?? profile.studentConsent,
        consentDate: new Date(),
      },
    });
  }

  return profile;
}

/**
 * Log consent action
 */
export async function logConsentAction(
  profileId: string,
  userId: string,
  action: 'edit' | 'delete_request',
  details: string,
  ipAddress: string,
  userAgent?: string
) {
  await prisma.profileAccessLog.create({
    data: {
      profileId,
      userId,
      action,
      details,
      ipAddress,
      userAgent,
    },
  });
}

/**
 * Mark profile for deletion (GDPR 30-day period)
 */
export async function markProfileForDeletion(profileId: string, userId: string, ipAddress: string, userAgent?: string) {
  const profile = await prisma.studentInsightProfile.update({
    where: { id: profileId },
    data: {
      deletionRequested: new Date(),
      parentConsent: false,
      studentConsent: false,
    },
  });

  await logConsentAction(profileId, userId, 'delete_request', 'Deletion requested, will be processed within 30 days', ipAddress, userAgent);

  return profile;
}

/**
 * Immediately delete profile and all data
 */
export async function deleteProfileImmediately(profileId: string, userId: string) {
  await prisma.profileAccessLog.deleteMany({
    where: { profileId },
  });

  await prisma.studentInsightProfile.delete({
    where: { id: profileId },
  });

  logger.info('Profile deleted immediately', { userId });
}
