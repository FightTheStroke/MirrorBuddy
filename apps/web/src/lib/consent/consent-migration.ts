const LEGACY_KEYS = ['tos_accepted', 'tos_accepted_version', 'mirrorbuddy-consent'] as const;
const UNIFIED_KEY = 'mirrorbuddy-unified-consent';

export function migrateLegacyConsentKeys(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(UNIFIED_KEY)) return false;

  const hadLegacy =
    sessionStorage.getItem(LEGACY_KEYS[0]) === 'true' ||
    sessionStorage.getItem(LEGACY_KEYS[1]) !== null ||
    localStorage.getItem(LEGACY_KEYS[2]) !== null;

  if (!hadLegacy) return false;

  const now = new Date().toISOString();
  localStorage.setItem(
    UNIFIED_KEY,
    JSON.stringify({
      version: '1.0',
      tos: { accepted: true, version: 'legacy', acceptedAt: now },
      cookies: { essential: true, analytics: true, acceptedAt: now },
    }),
  );
  return true;
}
