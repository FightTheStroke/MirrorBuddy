/**
 * Key Vault Dynamic API Routes
 * Individual secret operations (GET, PUT, DELETE)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { encryptSecret, decryptSecret } from "@/lib/admin/key-vault-encryption";
import type {
  UpdateSecretRequest,
  DecryptSecretResponse,
} from "@/lib/admin/key-vault-types";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Decrypt and return full secret value
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Validate admin authentication
    const adminAuth = await validateAdminAuth();
    if (!adminAuth.authenticated || !adminAuth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch secret from database
    const secret = await prisma.secretVault.findUnique({
      where: { id },
    });

    if (!secret) {
      return NextResponse.json({ error: "Secret not found" }, { status: 404 });
    }

    // Decrypt the value
    const decrypted = decryptSecret(
      secret.encrypted,
      secret.iv,
      secret.authTag,
    );

    // Update lastUsed timestamp
    await prisma.secretVault.update({
      where: { id },
      data: { lastUsed: new Date() },
    });

    const response: DecryptSecretResponse = { value: decrypted };
    return NextResponse.json(response);
  } catch (error) {
    logger.error("Failed to decrypt secret:", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Failed to decrypt secret" },
      { status: 500 },
    );
  }
}

/**
 * PUT - Update secret value or status
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Parse request body
    const body = (await request.json()) as UpdateSecretRequest;

    // Build update data
    const updateData: {
      encrypted?: string;
      iv?: string;
      authTag?: string;
      status?: string;
    } = {};

    if (body.value) {
      const { encrypted, iv, authTag } = encryptSecret(body.value);
      updateData.encrypted = encrypted;
      updateData.iv = iv;
      updateData.authTag = authTag;
    }

    if (body.status) {
      updateData.status = body.status;
    }

    // Update in database
    const secret = await prisma.secretVault.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: secret.id,
      service: secret.service,
      keyName: secret.keyName,
      status: secret.status,
    });
  } catch (error: unknown) {
    logger.error("Failed to update secret:", {
      error: String(error),
    });
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update secret";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * DELETE - Remove secret from vault
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Delete from database
    await prisma.secretVault.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("Failed to delete secret:", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Failed to delete secret" },
      { status: 500 },
    );
  }
}
