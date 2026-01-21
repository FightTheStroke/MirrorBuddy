// ============================================================================
// URL VALIDATION UTILITIES
// Secure URL validation to prevent substring injection attacks
// ============================================================================

/**
 * Checks if a URL is a Supabase production URL
 *
 * Security: Uses proper URL parsing instead of string.includes() to prevent:
 * - Subdomain spoofing: fake-supabase.com or supabase.com.evil.com
 * - Query parameter injection: evil.com?redirect=supabase.com
 * - Path injection: evil.com/supabase.com
 *
 * @param url - The URL string to validate
 * @returns true if the URL hostname is *.supabase.com or supabase.com
 *
 * @example
 * isSupabaseUrl('https://db.supabase.com')  // true
 * isSupabaseUrl('https://supabase.com')     // true
 * isSupabaseUrl('https://fake-supabase.com')  // false
 * isSupabaseUrl('https://supabase.com.evil.com')  // false
 * isSupabaseUrl('https://evil.com?x=supabase.com')  // false
 */
export function isSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Check if hostname is exactly 'supabase.com' or ends with '.supabase.com'
    return hostname === "supabase.com" || hostname.endsWith(".supabase.com");
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Checks if a connection string URL uses a production database
 * Handles both standard URLs and PostgreSQL connection strings
 *
 * @param connectionString - Database connection string (URL or postgresql://)
 * @returns true if the connection string points to a production database
 */
export function isProductionDatabase(connectionString: string): boolean {
  // Check for Supabase URLs
  if (isSupabaseUrl(connectionString)) {
    return true;
  }

  // Add other production database checks here if needed
  // e.g., AWS RDS, Azure Database, etc.

  return false;
}
