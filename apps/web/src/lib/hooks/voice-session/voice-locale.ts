export type VoiceLocale = 'it' | 'en' | 'es' | 'fr' | 'de';

const SUPPORTED_VOICE_LOCALES: ReadonlySet<VoiceLocale> = new Set(['it', 'en', 'es', 'fr', 'de']);

function isVoiceLocale(value: string): value is VoiceLocale {
  return SUPPORTED_VOICE_LOCALES.has(value as VoiceLocale);
}

/**
 * Normalize arbitrary locale strings (e.g. "en-US", "it_IT") to supported voice
 * locales. Defaults to Italian to match the product baseline.
 */
export function normalizeVoiceLocale(input: string | null | undefined): VoiceLocale {
  if (!input) return 'it';
  const normalized = input.trim().toLowerCase();
  const base = normalized.split(/[-_]/)[0] || '';
  return isVoiceLocale(base) ? base : 'it';
}
