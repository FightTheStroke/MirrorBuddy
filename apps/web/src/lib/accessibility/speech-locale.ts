/**
 * Speech language + voice selection for the shared Web Speech TTS.
 *
 * A11Y-1: the shared TTS hook used to request `it-IT` and to prefer an Italian
 * voice for every locale, so non-Italian students heard their own language read
 * with Italian phonetics. This module owns the two pure decisions:
 *
 * 1. which BCP-47 language we REQUEST for the active content locale, and
 * 2. which installed voice we are allowed to use for that language.
 *
 * Rule: we never substitute a voice from another language. When nothing on the
 * device speaks the requested language we return no voice and let the platform
 * resolve `utterance.lang` itself — silence or a system default is honest,
 * French read by an Italian voice is not.
 *
 * @module lib/accessibility/speech-locale
 */

import { normalizeVoiceLocale, type VoiceLocale } from '@/lib/hooks/voice-session/voice-locale';

/**
 * BCP-47 language requested for each supported app locale.
 * Typed against `VoiceLocale` so adding a product locale is a compile error
 * here instead of a silent fallback to Italian.
 */
const SPEECH_LANGUAGE_BY_LOCALE: Record<VoiceLocale, string> = {
  it: 'it-IT',
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
};

/** Minimal structural shape of a `SpeechSynthesisVoice`, so this stays testable. */
export interface SpeechVoiceLike {
  lang: string;
  name?: string;
  default?: boolean;
}

/** How closely the selected voice matches the requested language. */
export type SpeechVoiceMatch = 'exact' | 'language' | 'none';

export interface SpeechVoiceSelection<T extends SpeechVoiceLike = SpeechVoiceLike> {
  /** The voice to use, or `null` when nothing speaks the requested language. */
  voice: T | null;
  match: SpeechVoiceMatch;
}

function normalizeTag(tag: string | null | undefined): string {
  if (!tag) return '';
  return tag.trim().toLowerCase().replace(/_/g, '-');
}

function baseLanguage(tag: string): string {
  return normalizeTag(tag).split('-')[0] ?? '';
}

/**
 * Map an active content locale to the BCP-47 language to request from the
 * speech engine. Unsupported, empty or missing input falls back to the product
 * default locale (Italian) rather than guessing a language.
 */
export function resolveSpeechLanguage(locale: string | null | undefined): string {
  return SPEECH_LANGUAGE_BY_LOCALE[normalizeVoiceLocale(locale)];
}

/**
 * Pick the best installed voice for a requested BCP-47 language.
 *
 * Preference order: exact language tag (platform default first), then any other
 * region of the same language, then nothing. A voice of a DIFFERENT language is
 * never returned.
 */
export function selectSpeechVoice<T extends SpeechVoiceLike>(
  voices: readonly T[] | null | undefined,
  language: string | null | undefined,
): SpeechVoiceSelection<T> {
  const requested = normalizeTag(language);
  if (!requested || !Array.isArray(voices) || voices.length === 0) {
    return { voice: null, match: 'none' };
  }

  const requestedBase = baseLanguage(requested);
  const usable = voices.filter((voice) => Boolean(voice) && Boolean(normalizeTag(voice.lang)));

  const exact = usable.filter((voice) => normalizeTag(voice.lang) === requested);
  if (exact.length > 0) {
    return { voice: exact.find((voice) => voice.default) ?? exact[0], match: 'exact' };
  }

  const sameLanguage = usable.filter((voice) => baseLanguage(voice.lang) === requestedBase);
  if (sameLanguage.length > 0) {
    return {
      voice: sameLanguage.find((voice) => voice.default) ?? sameLanguage[0],
      match: 'language',
    };
  }

  return { voice: null, match: 'none' };
}
