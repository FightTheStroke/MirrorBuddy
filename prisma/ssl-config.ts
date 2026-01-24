/**
 * Shared SSL Configuration for Database Connections
 *
 * Handles SSL configuration for PostgreSQL connections via Prisma,
 * supporting both production (with certificate validation) and
 * development environments.
 */

/**
 * Get SSL configuration for database pool
 *
 * @returns SSL configuration object or undefined
 *
 * Behavior:
 * - With SUPABASE_CA_CERT: Use certificate with strict validation
 * - Production (NODE_ENV or VERCEL): Use SSL without certificate validation
 * - Development: No SSL (undefined)
 */
export function getSSLConfig():
  | {
      rejectUnauthorized: boolean;
      ca?: string;
    }
  | undefined {
  const supabaseCaCert = process.env.SUPABASE_CA_CERT;
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  if (supabaseCaCert) {
    return { rejectUnauthorized: true, ca: supabaseCaCert };
  }

  if (isProduction) {
    return { rejectUnauthorized: false };
  }

  return undefined;
}
