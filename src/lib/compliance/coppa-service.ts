/**
 * COPPA Compliance Service
 *
 * Implements Children's Online Privacy Protection Act (COPPA) requirements.
 * Users under 13 require verifiable parental consent before data collection.
 *
 * @module compliance/coppa-service
 * @see https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import {
  getParentalConsentRequestTemplate,
  getParentalConsentConfirmationTemplate,
} from "@/lib/email/templates/coppa-templates";
import { randomBytes } from "crypto";

const log = logger.child({ module: "coppa" });
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mirrorbuddy.app";

/** COPPA age threshold */
export const COPPA_AGE_THRESHOLD = 13;

/** Verification code expiry in milliseconds (48 hours) */
const VERIFICATION_EXPIRY_MS = 48 * 60 * 60 * 1000;

/**
 * COPPA consent status for a user
 */
export interface CoppaStatus {
  /** User requires parental consent (age < 13) */
  requiresConsent: boolean;
  /** Parental consent has been granted */
  consentGranted: boolean;
  /** Consent is pending verification */
  consentPending: boolean;
  /** User's age at consent request */
  age: number | null;
}

/**
 * Check if a user requires COPPA parental consent
 */
export async function checkCoppaStatus(userId: string): Promise<CoppaStatus> {
  try {
    // Get user profile for age
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { age: true },
    });

    const age = profile?.age ?? null;
    const requiresConsent = age !== null && age < COPPA_AGE_THRESHOLD;

    if (!requiresConsent) {
      return {
        requiresConsent: false,
        consentGranted: false,
        consentPending: false,
        age,
      };
    }

    // Check if consent record exists
    const consent = await prisma.coppaConsent.findUnique({
      where: { userId },
      select: {
        consentGranted: true,
        consentGrantedAt: true,
        verificationSentAt: true,
        verificationExpiresAt: true,
      },
    });

    if (consent?.consentGranted) {
      return {
        requiresConsent: true,
        consentGranted: true,
        consentPending: false,
        age,
      };
    }

    // Check if verification is pending
    const consentPending = Boolean(
      consent?.verificationSentAt &&
      consent?.verificationExpiresAt &&
      new Date(consent.verificationExpiresAt) > new Date(),
    );

    return {
      requiresConsent: true,
      consentGranted: false,
      consentPending,
      age,
    };
  } catch (error) {
    log.error("Failed to check COPPA status", { userId, error: String(error) });
    // Fail safe: require consent on error for under-13
    return {
      requiresConsent: true,
      consentGranted: false,
      consentPending: false,
      age: null,
    };
  }
}

/**
 * Generate verification code
 */
function generateVerificationCode(): string {
  return randomBytes(3).toString("hex").toUpperCase(); // 6 char code
}

/**
 * Request parental consent for a user
 * Initiates the consent flow by creating a consent record and sending verification email
 */
export async function requestParentalConsent(
  userId: string,
  age: number,
  parentEmail: string,
  childName?: string,
): Promise<{ verificationCode: string; expiresAt: Date; emailSent: boolean }> {
  const verificationCode = generateVerificationCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + VERIFICATION_EXPIRY_MS);

  // Get child name from profile if not provided
  let resolvedName: string = childName || "";
  if (!resolvedName) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { name: true },
    });
    resolvedName = profile?.name || "il tuo bambino";
  }

  await prisma.coppaConsent.upsert({
    where: { userId },
    create: {
      userId,
      ageAtConsent: age,
      parentEmail,
      verificationCode,
      verificationSentAt: now,
      verificationExpiresAt: expiresAt,
    },
    update: {
      parentEmail,
      verificationCode,
      verificationSentAt: now,
      verificationExpiresAt: expiresAt,
      consentGranted: false,
      consentGrantedAt: null,
      consentDeniedAt: null,
    },
  });

  // Send verification email to parent
  let emailSent = false;
  if (isEmailConfigured()) {
    const verificationUrl = `${APP_URL}/coppa/verify?code=${verificationCode}`;
    const template = getParentalConsentRequestTemplate({
      childName: resolvedName,
      childAge: age,
      parentEmail,
      verificationCode,
      verificationUrl,
      expiresAt,
    });

    const result = await sendEmail({
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    emailSent = result.success;
    if (!result.success) {
      log.error("Failed to send COPPA verification email", {
        userId,
        parentEmail,
        error: result.error,
      });
    }
  } else {
    log.warn("Email not configured, COPPA verification email not sent", {
      userId,
      parentEmail,
    });
  }

  log.info("Parental consent requested", {
    userId,
    age,
    expiresAt: expiresAt.toISOString(),
    emailSent,
  });

  return { verificationCode, expiresAt, emailSent };
}

/**
 * Verify parental consent with code
 */
export async function verifyParentalConsent(
  verificationCode: string,
  ipAddress?: string,
): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    const consent = await prisma.coppaConsent.findFirst({
      where: { verificationCode },
      select: {
        id: true,
        userId: true,
        parentEmail: true,
        verificationExpiresAt: true,
        consentGranted: true,
      },
    });

    if (!consent) {
      return { success: false, error: "Invalid verification code" };
    }

    if (consent.consentGranted) {
      return { success: true, userId: consent.userId };
    }

    if (
      consent.verificationExpiresAt &&
      new Date(consent.verificationExpiresAt) < new Date()
    ) {
      return { success: false, error: "Verification code expired" };
    }

    // Grant consent
    await prisma.coppaConsent.update({
      where: { id: consent.id },
      data: {
        consentGranted: true,
        consentGrantedAt: new Date(),
        parentIpAddress: ipAddress,
        verificationCode: null, // Clear code after use
      },
    });

    log.info("Parental consent granted", { userId: consent.userId });

    // Send confirmation email to parent
    if (isEmailConfigured() && consent.parentEmail) {
      const profile = await prisma.profile.findUnique({
        where: { userId: consent.userId },
        select: { name: true },
      });
      const childName = profile?.name || "il tuo bambino";

      const template = getParentalConsentConfirmationTemplate({
        childName,
        parentEmail: consent.parentEmail,
      });

      const result = await sendEmail({
        to: template.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (!result.success) {
        log.warn("Failed to send COPPA confirmation email", {
          userId: consent.userId,
          error: result.error,
        });
      }
    }

    return { success: true, userId: consent.userId };
  } catch (error) {
    log.error("Failed to verify parental consent", { error: String(error) });
    return { success: false, error: "Verification failed" };
  }
}

/**
 * Deny parental consent by verification code (parent declines via email link)
 * This function denies consent WITHOUT granting it first, ensuring the parent's
 * denial is honored immediately and atomically.
 */
export async function denyParentalConsentByCode(
  verificationCode: string,
  ipAddress?: string,
): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    const consent = await prisma.coppaConsent.findFirst({
      where: { verificationCode },
      select: {
        id: true,
        userId: true,
        verificationExpiresAt: true,
        consentGranted: true,
      },
    });

    if (!consent) {
      return { success: false, error: "Invalid verification code" };
    }

    if (
      consent.verificationExpiresAt &&
      new Date(consent.verificationExpiresAt) < new Date()
    ) {
      return { success: false, error: "Verification code expired" };
    }

    // Deny consent directly - no granting first
    await prisma.coppaConsent.update({
      where: { id: consent.id },
      data: {
        consentGranted: false,
        consentDeniedAt: new Date(),
        parentIpAddress: ipAddress,
        verificationCode: null, // Clear code after use
      },
    });

    log.info("Parental consent denied via code", { userId: consent.userId });

    return { success: true, userId: consent.userId };
  } catch (error) {
    log.error("Failed to deny parental consent by code", {
      error: String(error),
    });
    return { success: false, error: "Denial failed" };
  }
}

/**
 * Deny parental consent by userId (admin action)
 */
export async function denyParentalConsent(
  userId: string,
): Promise<{ success: boolean }> {
  try {
    await prisma.coppaConsent.update({
      where: { userId },
      data: {
        consentGranted: false,
        consentDeniedAt: new Date(),
        verificationCode: null,
      },
    });

    log.info("Parental consent denied", { userId });
    return { success: true };
  } catch (error) {
    log.error("Failed to deny consent", { userId, error: String(error) });
    return { success: false };
  }
}

/**
 * Check if user can access full features
 * Returns true if user is 13+ OR has parental consent
 */
export async function canAccessFullFeatures(userId: string): Promise<boolean> {
  const status = await checkCoppaStatus(userId);
  return !status.requiresConsent || status.consentGranted;
}
