/**
 * Staging environment detector for Vercel deployments.
 * Detects when running on Vercel preview environments (staging).
 *
 * Vercel automatically sets VERCEL_ENV to:
 * - 'production' for main branch deployments
 * - 'preview' for preview deployments (pull requests, feature branches)
 * - 'development' for local development
 */

/**
 * Detects if the application is running in staging environment.
 * Returns true when deployed to Vercel preview environment.
 *
 * @returns {boolean} True if VERCEL_ENV === 'preview', false otherwise
 *
 * @example
 * if (isStaging()) {
 *   // Enable staging-only features
 * }
 */
export function isStaging(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

/**
 * Synchronous constant indicating current staging status.
 * Evaluated at build/runtime to determine if running in staging.
 *
 * @type {boolean}
 */
export const isStagingMode: boolean = isStaging();

/**
 * Environment type union for type-safe environment names.
 */
type EnvironmentName = "production" | "staging" | "development";

/**
 * Returns the current environment name.
 * Maps Vercel's VERCEL_ENV to human-readable environment names.
 *
 * @returns {'production' | 'staging' | 'development'} Current environment
 *
 * @example
 * const env = getEnvironmentName();
 * // Returns: 'staging', 'production', or 'development'
 */
export function getEnvironmentName(): EnvironmentName {
  const vercelEnv = process.env.VERCEL_ENV;

  switch (vercelEnv) {
    case "preview":
      return "staging";
    case "production":
      return "production";
    case "development":
      return "development";
    default:
      // Fallback to development for missing or unknown values
      return "development";
  }
}
