/**
 * Key Vault Dynamic API Routes
 * Individual secret operations (GET, PUT, DELETE)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { encryptSecret, decryptSecret } from "@/lib/admin/key-vault-encryption";
import type {
  UpdateSecretRequest,
  DecryptSecretResponse,
} from "@/lib/admin/key-vault-types";

/**
 * GET - Decrypt and return full secret value
 */
export const GET = pipe(
  withSentry("/api/admin/key-vault/:id"),
  withAdmin,
)(async (ctx) => {
  const { id } = await ctx.params;

  // Fetch secret from database
  const secret = await prisma.secretVault.findUnique({
    where: { id },
  });

  if (!secret) {
    return NextResponse.json({ error: "Secret not found" }, { status: 404 });
  }

  // Decrypt the value
  const decrypted = decryptSecret(secret.encrypted, secret.iv, secret.authTag);

  // Update lastUsed timestamp
  await prisma.secretVault.update({
    where: { id },
    data: { lastUsed: new Date() },
  });

  const response: DecryptSecretResponse = { value: decrypted };
  return NextResponse.json(response);
});

/**
 * PUT - Update secret value or status
 */
export const PUT = pipe(
  withSentry("/api/admin/key-vault/:id"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const { id } = await ctx.params;

  // Parse request body
  const body = (await ctx.req.json()) as UpdateSecretRequest;

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
});

/**
 * DELETE - Remove secret from vault
 */
export const DELETE = pipe(
  withSentry("/api/admin/key-vault/:id"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const { id } = await ctx.params;

  // Delete from database
  await prisma.secretVault.delete({
    where: { id },
  });

  return NextResponse.json({ success: true }, { status: 200 });
});
