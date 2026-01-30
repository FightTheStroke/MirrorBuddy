/**
 * Key Vault API Routes
 * CRUD operations for encrypted API key storage
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import {
  encryptSecret,
  decryptSecret,
  maskValue,
} from "@/lib/admin/key-vault-encryption";
import type {
  MaskedSecretVaultEntry,
  CreateSecretRequest,
} from "@/lib/admin/key-vault-types";
import { logger } from "@/lib/logger";

/**
 * GET - List all stored keys (masked values only)
 */
export async function GET(_request: NextRequest) {
  try {
    // Validate admin authentication
    const adminAuth = await validateAdminAuth();
    if (!adminAuth.authenticated || !adminAuth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all secrets from database
    const secrets = await prisma.secretVault.findMany({
      orderBy: { updatedAt: "desc" },
    });

    // Decrypt and mask values
    const maskedSecrets: MaskedSecretVaultEntry[] = secrets.map((secret) => {
      try {
        const decrypted = decryptSecret(
          secret.encrypted,
          secret.iv,
          secret.authTag,
        );
        const masked = maskValue(decrypted);

        return {
          id: secret.id,
          service: secret.service,
          keyName: secret.keyName,
          maskedValue: masked,
          status: secret.status as "active" | "expired" | "rotated",
          lastUsed: secret.lastUsed,
          createdAt: secret.createdAt,
          updatedAt: secret.updatedAt,
        };
      } catch (_error) {
        // If decryption fails, show error state
        return {
          id: secret.id,
          service: secret.service,
          keyName: secret.keyName,
          maskedValue: "ERROR: Cannot decrypt",
          status: "expired" as const,
          lastUsed: secret.lastUsed,
          createdAt: secret.createdAt,
          updatedAt: secret.updatedAt,
        };
      }
    });

    return NextResponse.json({ secrets: maskedSecrets });
  } catch (error) {
    logger.error("Failed to fetch secrets:", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch secrets" },
      { status: 500 },
    );
  }
}

/**
 * POST - Create new secret
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF check first
    const csrfValid = requireCSRF(request);
    if (!csrfValid) {
      return NextResponse.json(
        { error: "CSRF validation failed" },
        { status: 403 },
      );
    }

    // Validate admin authentication
    const adminAuth = await validateAdminAuth();
    if (!adminAuth.authenticated || !adminAuth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = (await request.json()) as CreateSecretRequest;
    if (!body.service || !body.keyName || !body.value) {
      return NextResponse.json(
        { error: "Missing required fields: service, keyName, value" },
        { status: 400 },
      );
    }

    // Encrypt the secret
    const { encrypted, iv, authTag } = encryptSecret(body.value);

    // Store in database
    const secret = await prisma.secretVault.create({
      data: {
        service: body.service,
        keyName: body.keyName,
        encrypted,
        iv,
        authTag,
        status: "active",
      },
    });

    return NextResponse.json(
      {
        id: secret.id,
        service: secret.service,
        keyName: secret.keyName,
        status: secret.status,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    logger.error("Failed to create secret:", {
      error: String(error),
    });
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create secret";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
