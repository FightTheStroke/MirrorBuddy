/**
 * PII Middleware for Prisma
 *
 * Automatically encrypts PII fields on write operations (create, update)
 * and decrypts PII fields on read operations (findFirst, findMany, findUnique).
 *
 * Uses AES-256-GCM encryption from the PII encryption service.
 *
 * @module db/pii-middleware
 */

import { encryptPII, decryptPII, hashPII } from '@/lib/security';
import { logDecryptAccess, logBulkDecryptAccess } from '@/lib/security';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

/**
 * Map of models to their PII fields that need encryption/decryption
 */
export const PII_FIELD_MAP: Record<string, string[]> = {
  User: ['email'],
  Profile: ['name'],
  GoogleAccount: ['email', 'displayName'],
  CoppaConsent: ['parentEmail'],
  StudyKit: ['originalText'],
  HtmlSnippet: ['html'],
};

/**
 * Map of Prisma relation field names to their model names.
 * Used by decryptSingleRecord to recursively decrypt nested
 * included relations (e.g. User.findUnique({ include: { profile: true } })).
 */
export const RELATION_TO_MODEL: Record<string, string> = {
  user: 'User',
  profile: 'Profile',
  googleAccount: 'GoogleAccount',
  coppaConsent: 'CoppaConsent',
  studyKits: 'StudyKit',
  htmlSnippets: 'HtmlSnippet',
};

/**
 * Check if a model has PII fields configured
 */
export function hasPIIFields(model: string): boolean {
  return model in PII_FIELD_MAP && PII_FIELD_MAP[model].length > 0;
}

/**
 * Recursively encrypt PII fields in data object
 * Also computes emailHash for email fields (User.email, GoogleAccount.email)
 */
export async function encryptPIIFields(
  model: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!hasPIIFields(model)) {
    return data;
  }

  const piiFields = PII_FIELD_MAP[model];
  const encryptedData = { ...data };

  // Encrypt direct PII fields
  for (const field of piiFields) {
    if (field in data && data[field] != null && typeof data[field] === 'string') {
      const plaintext = data[field] as string;
      encryptedData[field] = await encryptPII(plaintext);

      // Compute emailHash for email fields
      if (field === 'email' && (model === 'User' || model === 'GoogleAccount')) {
        encryptedData.emailHash = await hashPII(plaintext);
      }
    }
  }

  // Handle nested creates/updates
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nestedValue = value as Record<string, unknown>;

      // Handle nested create
      if ('create' in nestedValue && typeof nestedValue.create === 'object') {
        const createData = nestedValue.create as Record<string, unknown>;
        // Try to determine the model name from the relation field
        // For now, we'll process all known models
        for (const [nestedModel, fields] of Object.entries(PII_FIELD_MAP)) {
          if (fields.some((f) => f in createData)) {
            encryptedData[key] = {
              ...nestedValue,
              create: await encryptPIIFields(nestedModel, createData),
            };
            break;
          }
        }
      }

      // Handle nested update
      if ('update' in nestedValue && typeof nestedValue.update === 'object') {
        const updateData = nestedValue.update as Record<string, unknown>;
        for (const [nestedModel, fields] of Object.entries(PII_FIELD_MAP)) {
          if (fields.some((f) => f in updateData)) {
            encryptedData[key] = {
              ...nestedValue,
              update: await encryptPIIFields(nestedModel, updateData),
            };
            break;
          }
        }
      }
    }
  }

  return encryptedData;
}

/**
 * Recursively decrypt PII fields in result object(s)
 * Logs all decryption operations to ComplianceAuditEntry table (F-08).
 *
 * FAULT-TOLERANT: Individual field decryption failures are caught and logged.
 * Failed fields get a placeholder value instead of crashing the entire query.
 */
export async function decryptPIIFields(model: string, result: unknown): Promise<unknown> {
  if (!result || !hasPIIFields(model)) {
    return result;
  }

  const piiFields = PII_FIELD_MAP[model];

  // Handle array of results
  if (Array.isArray(result)) {
    const decryptedResults = await Promise.all(
      result.map((item) => decryptSingleRecord(model, piiFields, item)),
    );

    // Log bulk decryption (fire-and-forget)
    if (result.length > 0) {
      for (const field of piiFields) {
        const fieldCount = result.filter(
          (item) =>
            typeof item === 'object' &&
            item !== null &&
            field in item &&
            (item as Record<string, unknown>)[field] != null,
        ).length;

        if (fieldCount > 0) {
          logBulkDecryptAccess(model, field, fieldCount);
        }
      }
    }

    return decryptedResults;
  }

  // Handle single result
  return decryptSingleRecord(model, piiFields, result);
}

/**
 * Decrypt PII fields in a single record with per-field error handling.
 * Never throws - logs errors and returns placeholder for failed fields.
 */
async function decryptSingleRecord(
  model: string,
  piiFields: string[],
  record: unknown,
): Promise<unknown> {
  if (!record || typeof record !== 'object') {
    return record;
  }

  const data = record as Record<string, unknown>;
  const decryptedData = { ...data };

  for (const field of piiFields) {
    if (field in data && data[field] != null && typeof data[field] === 'string') {
      try {
        decryptedData[field] = await decryptPII(data[field] as string, {
          throwOnError: false,
        });

        logDecryptAccess({
          model,
          field,
          context: { operation: 'decrypt' },
        });
      } catch (error) {
        // Per-field catch: log and use placeholder, never crash the query
        logger.error(`[PII-Middleware] Decrypt failed for ${model}.${field}`, {
          error: String(error),
        });
        decryptedData[field] = '[decryption-failed]';
      }
    }
  }

  // Recursively decrypt nested included relations
  for (const [key, value] of Object.entries(decryptedData)) {
    const nestedModel = RELATION_TO_MODEL[key];
    if (!nestedModel || !hasPIIFields(nestedModel)) continue;

    if (Array.isArray(value)) {
      decryptedData[key] = await decryptPIIFields(nestedModel, value);
    } else if (value && typeof value === 'object') {
      decryptedData[key] = await decryptPIIFields(nestedModel, value);
    }
  }

  return decryptedData;
}

/**
 * Create PII middleware as a Prisma Client Extension
 *
 * This extension intercepts Prisma queries to automatically:
 * - Encrypt PII fields on create/update/updateMany operations
 * - Decrypt PII fields on findFirst/findMany/findUnique operations
 *
 * @returns Prisma Client Extension configuration
 */
export function createPIIMiddleware() {
  return Prisma.defineExtension({
    name: 'pii-encryption-middleware',
    query: {
      $allModels: {
        // Intercept create operations
        async create({ model, operation: _operation, args, query }) {
          if (hasPIIFields(model) && args.data) {
            args.data = await encryptPIIFields(model, args.data as Record<string, unknown>);
          }
          const result = await query(args);
          return decryptPIIFields(model, result);
        },

        // Intercept update operations
        async update({ model, operation: _operation, args, query }) {
          if (hasPIIFields(model) && args.data) {
            args.data = await encryptPIIFields(model, args.data as Record<string, unknown>);
          }
          const result = await query(args);
          return decryptPIIFields(model, result);
        },

        // Intercept updateMany operations
        async updateMany({ model, operation: _operation, args, query }) {
          if (hasPIIFields(model) && args.data) {
            args.data = await encryptPIIFields(model, args.data as Record<string, unknown>);
          }
          return query(args);
        },

        // Intercept upsert operations (encrypt both create and update data)
        async upsert({ model, operation: _operation, args, query }) {
          if (hasPIIFields(model)) {
            if (args.create) {
              args.create = await encryptPIIFields(model, args.create as Record<string, unknown>);
            }
            if (args.update) {
              args.update = await encryptPIIFields(model, args.update as Record<string, unknown>);
            }
          }
          const result = await query(args);
          return decryptPIIFields(model, result);
        },

        // Intercept findUnique operations
        async findUnique({ model, operation: _operation, args, query }) {
          const result = await query(args);
          return decryptPIIFields(model, result);
        },

        // Intercept findFirst operations
        async findFirst({ model, operation: _operation, args, query }) {
          const result = await query(args);
          return decryptPIIFields(model, result);
        },

        // Intercept findMany operations
        async findMany({ model, operation: _operation, args, query }) {
          const result = await query(args);
          return decryptPIIFields(model, result);
        },
      },
    },
  });
}
