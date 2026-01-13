// ============================================================================
// DATABASE DETECTION UTILITY
// Detects which database backend is being used (SQLite vs PostgreSQL)
// Caches result for performance to avoid repeated checks
// ============================================================================

/**
 * Database type enum
 */
export type DatabaseType = 'sqlite' | 'postgresql';

/**
 * Cached database type - computed once and reused
 */
let cachedDatabaseType: DatabaseType | null = null;

/**
 * Detect database type based on DATABASE_URL
 * Caches the result to avoid repeated environment variable access
 *
 * @returns 'postgresql' if using PostgreSQL, 'sqlite' otherwise (includes libSQL/Turso)
 */
export function getDatabaseType(): DatabaseType {
  // Return cached result if available
  if (cachedDatabaseType !== null) {
    return cachedDatabaseType;
  }

  // Get DATABASE_URL from environment
  const databaseUrl = process.env.DATABASE_URL || '';

  // Check if URL starts with postgresql:// or postgres://
  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    cachedDatabaseType = 'postgresql';
  } else {
    // Default to SQLite for file://, libsql://, or no URL
    cachedDatabaseType = 'sqlite';
  }

  return cachedDatabaseType;
}

/**
 * Check if the current database is PostgreSQL
 *
 * @returns true if using PostgreSQL, false otherwise
 */
export function isPostgreSQL(): boolean {
  return getDatabaseType() === 'postgresql';
}

/**
 * Check if the current database is SQLite (or libSQL/Turso)
 *
 * @returns true if using SQLite/libSQL, false otherwise
 */
export function isSQLite(): boolean {
  return getDatabaseType() === 'sqlite';
}

/**
 * Reset the cached database type (useful for testing)
 * @internal
 */
export function resetDatabaseTypeCache(): void {
  cachedDatabaseType = null;
}
