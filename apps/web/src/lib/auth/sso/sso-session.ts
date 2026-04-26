// ============================================================================
// SSO SESSION MANAGEMENT
// PKCE state storage and retrieval for SSO flows
// Created for F-04: School Admin SSO Integration
// ============================================================================

import { prisma } from "@/lib/db";
import { generatePKCE, generateState, generateNonce } from "./oidc-utils";

const SSO_SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface SSOSessionData {
  state: string;
  codeVerifier: string;
  nonce: string;
  provider: "google" | "microsoft";
  redirectUri: string;
}

/**
 * Create a new SSO session with PKCE parameters
 * Stores state in database for stateless callback handling
 */
export async function createSSOSession(
  provider: "google" | "microsoft",
  redirectUri: string,
): Promise<SSOSessionData> {
  const { codeVerifier, codeChallenge: _ } = generatePKCE();
  const state = generateState();
  const nonce = generateNonce();

  await prisma.sSOSession.create({
    data: {
      state,
      codeVerifier,
      nonce,
      provider,
      redirectUri,
      expiresAt: new Date(Date.now() + SSO_SESSION_TTL_MS),
    },
  });

  return { state, codeVerifier, nonce, provider, redirectUri };
}

/**
 * Retrieve and consume an SSO session by state parameter
 * Deletes the session after retrieval (one-time use)
 */
export async function consumeSSOSession(
  state: string,
): Promise<SSOSessionData | null> {
  const session = await prisma.sSOSession.findUnique({
    where: { state },
  });

  if (!session) {
    return null;
  }

  // Check expiration
  if (session.expiresAt < new Date()) {
    await prisma.sSOSession.delete({ where: { state } });
    return null;
  }

  // Delete session (one-time use)
  await prisma.sSOSession.delete({ where: { state } });

  return {
    state: session.state,
    codeVerifier: session.codeVerifier,
    nonce: session.nonce,
    provider: session.provider as "google" | "microsoft",
    redirectUri: session.redirectUri,
  };
}

/**
 * Clean up expired SSO sessions
 * Should be called periodically (e.g., via cron)
 */
export async function cleanupExpiredSSOSessions(): Promise<number> {
  const result = await prisma.sSOSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
