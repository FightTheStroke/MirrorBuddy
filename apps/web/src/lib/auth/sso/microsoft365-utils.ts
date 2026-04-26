// ============================================================================
// MICROSOFT 365 UTILITIES
// Helper functions for Microsoft 365 SSO integration
// Created for F-05: Microsoft 365 SSO Integration
// ============================================================================

import type { MicrosoftUserInfo } from "./microsoft365";

/**
 * Detect if user belongs to an education tenant
 * @param userInfo - User information from ID token or UserInfo endpoint
 * @returns True if user is from an educational institution
 */
export function isEducationTenant(userInfo: MicrosoftUserInfo): boolean {
  const email = userInfo.email?.toLowerCase() || "";
  const preferredUsername = userInfo.preferred_username?.toLowerCase() || "";

  const eduDomains = [".edu", ".edu.", ".ac.", ".school", ".k12"];
  const emailDomain = email.split("@")[1] || "";

  return eduDomains.some(
    (domain) =>
      emailDomain.includes(domain) || preferredUsername.includes(domain),
  );
}

/**
 * Extract school domain from user email
 * @param userInfo - User information containing email
 * @returns School domain (e.g., 'school.edu') or null
 */
export function getSchoolDomain(userInfo: MicrosoftUserInfo): string | null {
  const email = userInfo.email || userInfo.preferred_username;
  if (!email) {
    return null;
  }

  const domain = email.split("@")[1];
  return domain || null;
}
