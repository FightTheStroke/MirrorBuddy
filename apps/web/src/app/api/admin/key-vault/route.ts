/**
 * Key Vault API Routes
 * CRUD operations for encrypted API key storage
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pipe, withSentry, withCSRF, withAdmin, withAdminReadOnly } from '@/lib/api/middlewares';
import { encryptSecret, decryptSecret, maskValue } from '@/lib/admin/key-vault-encryption';
import type { MaskedSecretVaultEntry, CreateSecretRequest } from '@/lib/admin/key-vault-types';

/**
 * GET - List all stored keys (masked values only)
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/admin/key-vault'),
  withAdminReadOnly,
)(async (_ctx) => {
  try {
    // Fetch all secrets from database
    const secrets = await prisma.secretVault.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    // Decrypt and mask values
    const maskedSecrets: MaskedSecretVaultEntry[] = secrets.map((secret) => {
      try {
        const decrypted = decryptSecret(secret.encrypted, secret.iv, secret.authTag);
        const masked = maskValue(decrypted);

        return {
          id: secret.id,
          service: secret.service,
          keyName: secret.keyName,
          maskedValue: masked,
          status: secret.status as 'active' | 'expired' | 'rotated',
          lastUsed: secret.lastUsed,
          createdAt: secret.createdAt,
          updatedAt: secret.updatedAt,
        };
      } catch (_error) {
        // If decryption fails (decryption_failed case), show error state
        // This indicates data exists but can't be decrypted (corrupted or wrong key)
        return {
          id: secret.id,
          service: secret.service,
          keyName: secret.keyName,
          maskedValue: 'ERROR: Cannot decrypt',
          status: 'expired' as const,
          lastUsed: secret.lastUsed,
          createdAt: secret.createdAt,
          updatedAt: secret.updatedAt,
        };
      }
    });

    return NextResponse.json({ secrets: maskedSecrets });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for encryption configuration issues
    if (errorMessage.includes('TOKEN_ENCRYPTION_KEY') || errorMessage.includes('32 char')) {
      return NextResponse.json(
        {
          error: 'encryption_not_configured',
          message:
            'TOKEN_ENCRYPTION_KEY environment variable is not set or too short (min 32 chars)',
        },
        { status: 503 },
      );
    }

    // Check for database connection issues
    if (
      errorMessage.includes('database') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('Prisma') ||
      errorMessage.includes("Can't reach")
    ) {
      return NextResponse.json(
        {
          error: 'database_error',
          message: 'Database connection error. Please check database connectivity.',
        },
        { status: 500 },
      );
    }

    // Generic error fallback
    return NextResponse.json(
      {
        error: 'internal_error',
        message: errorMessage || 'An unexpected error occurred',
      },
      { status: 500 },
    );
  }
});

/**
 * POST - Create new secret
 */
export const POST = pipe(
  withSentry('/api/admin/key-vault'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  // Parse and validate request body
  const body = (await ctx.req.json()) as CreateSecretRequest;
  if (!body.service || !body.keyName || !body.value) {
    return NextResponse.json(
      { error: 'Missing required fields: service, keyName, value' },
      { status: 400 },
    );
  }

  try {
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
        status: 'active',
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('TOKEN_ENCRYPTION_KEY') || errorMessage.includes('32 char')) {
      return NextResponse.json(
        {
          error: 'encryption_not_configured',
          message:
            'TOKEN_ENCRYPTION_KEY environment variable is not set or too short (min 32 chars)',
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: 'internal_error', message: errorMessage }, { status: 500 });
  }
});
