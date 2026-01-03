// ============================================================================
// SESSION STORAGE KEY MIGRATION
// Migrates old 'convergio-user-id' to new 'mirrorbuddy-user-id'
// ============================================================================

/**
 * Migrate sessionStorage key from old branding to new
 * Call this once on app initialization (e.g., in layout.tsx useEffect)
 */
export function migrateSessionStorageKey(): void {
  if (typeof window === 'undefined') return;

  const oldKey = 'convergio-user-id';
  const newKey = 'mirrorbuddy-user-id';

  try {
    const oldValue = sessionStorage.getItem(oldKey);
    if (oldValue && !sessionStorage.getItem(newKey)) {
      sessionStorage.setItem(newKey, oldValue);
      sessionStorage.removeItem(oldKey);
      console.log('[Migration] Session key migrated to mirrorbuddy-user-id');
    }
  } catch {
    // sessionStorage may not be available (SSR, private browsing)
  }
}
