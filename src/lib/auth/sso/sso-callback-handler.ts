// ============================================================================
// SSO CALLBACK HANDLER
// Shared logic for processing SSO callbacks from any OIDC provider
// Created for F-04: School Admin SSO Integration
// ============================================================================

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { OIDCUserInfo } from "./oidc-provider";

export interface SSOCallbackResult {
  userId: string;
  isNewUser: boolean;
  redirectUrl: string;
}

/**
 * Determine user role from OIDC claims
 * Maps provider-specific claims to MirrorBuddy roles
 */
function determineRole(
  userInfo: OIDCUserInfo,
  provider: "google" | "microsoft",
): "USER" | "ADMIN" {
  const email = userInfo.email.toLowerCase();

  // Check for admin indicators in provider-specific claims
  if (provider === "google") {
    const isAdmin =
      userInfo["hd"] !== undefined &&
      (email.includes("admin") || email.includes("dirigente"));
    if (isAdmin) return "ADMIN";
  }

  if (provider === "microsoft") {
    const roles = userInfo["roles"] as string[] | undefined;
    if (roles?.some((r) => r.toLowerCase().includes("admin"))) {
      return "ADMIN";
    }
  }

  return "USER";
}

/**
 * Find school by SSO domain
 */
async function findSchoolByDomain(
  domain: string,
  provider: "google" | "microsoft",
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
  provider: "google" | "microsoft",
): Promise<SSOCallbackResult> {
  const email = userInfo.email.toLowerCase();
  const domain = email.split("@")[1];
  const role = determineRole(userInfo, provider);

  logger.info("[SSO] Processing callback", {
    provider,
    email: email.slice(0, 3) + "***",
    domain,
  });

  // Check if user exists by email
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    logger.info("[SSO] Linked existing user", {
      userId: existingUser.id,
      provider,
    });
    return {
      userId: existingUser.id,
      isNewUser: false,
      redirectUrl: "/dashboard",
    };
  }

  // Find school association
  const school = await findSchoolByDomain(domain, provider);

  // Create new user
  const newUser = await prisma.user.create({
    data: {
      email,
      username: email,
      role,
      profile: {
        create: {
          name:
            userInfo.name ||
            `${userInfo.given_name || ""} ${userInfo.family_name || ""}`.trim() ||
            email.split("@")[0],
        },
      },
    },
  });

  logger.info("[SSO] Created new user", {
    userId: newUser.id,
    provider,
    schoolId: school?.schoolId,
    role,
  });

  return {
    userId: newUser.id,
    isNewUser: true,
    redirectUrl: "/welcome",
  };
}
