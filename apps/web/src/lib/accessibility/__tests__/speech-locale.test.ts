/**
 * Speech locale helper (A11Y-1).
 *
 * The shared Web Speech TTS used to hardcode `it-IT` and to prefer an Italian
 * voice for every locale, so a French or German student heard their own text
 * read with Italian phonetics. These tests lock the two pure decisions behind
 * the fix: which BCP-47 language we REQUEST for the active content locale, and
 * which installed voice (if any) we are allowed to select for it.
 *
 * Scope note: this file proves the requested language and the voice choice.
 * It cannot prove the audio a real speech engine produces.
 */

import { describe, it, expect } from 'vitest';
import { locales } from '@/i18n/config';
import { resolveSpeechLanguage, selectSpeechVoice, type SpeechVoiceLike } from '../speech-locale';

function voice(lang: string, name: string, isDefault = false): SpeechVoiceLike {
  return { lang, name, default: isDefault };
}

describe('resolveSpeechLanguage', () => {
  it('maps every supported app locale to a distinct BCP-47 language tag', () => {
    const tags = locales.map((locale) => resolveSpeechLanguage(locale));
    expect(tags).toEqual(['it-IT', 'en-US', 'fr-FR', 'de-DE', 'es-ES']);
    expect(new Set(tags).size).toBe(locales.length);
  });

  it('accepts region-qualified and underscore-separated inputs', () => {
    expect(resolveSpeechLanguage('fr-CA')).toBe('fr-FR');
    expect(resolveSpeechLanguage('DE_AT')).toBe('de-DE');
    expect(resolveSpeechLanguage(' en-GB ')).toBe('en-US');
  });

  it('falls back to the default locale for null, empty or unsupported input', () => {
    expect(resolveSpeechLanguage(null)).toBe('it-IT');
    expect(resolveSpeechLanguage(undefined)).toBe('it-IT');
    expect(resolveSpeechLanguage('')).toBe('it-IT');
    expect(resolveSpeechLanguage('pt-BR')).toBe('it-IT');
  });
});

describe('selectSpeechVoice', () => {
  it('prefers an exact language-tag match', () => {
    const voices = [voice('it-IT', 'Alice'), voice('fr-CA', 'Amelie'), voice('fr-FR', 'Thomas')];
    const selection = selectSpeechVoice(voices, 'fr-FR');
    expect(selection.match).toBe('exact');
    expect(selection.voice?.name).toBe('Thomas');
  });

  it('is case and separator insensitive on the voice tag', () => {
    const selection = selectSpeechVoice([voice('FR_fr', 'Thomas')], 'fr-FR');
    expect(selection.match).toBe('exact');
    expect(selection.voice?.name).toBe('Thomas');
  });

  it('accepts another region of the same language when no exact tag exists', () => {
    const voices = [voice('it-IT', 'Alice'), voice('fr-CA', 'Amelie')];
    const selection = selectSpeechVoice(voices, 'fr-FR');
    expect(selection.match).toBe('language');
    expect(selection.voice?.name).toBe('Amelie');
  });

  it('prefers the platform default voice among equally matching candidates', () => {
    const voices = [voice('fr-FR', 'Thomas'), voice('fr-FR', 'Audrey', true)];
    expect(selectSpeechVoice(voices, 'fr-FR').voice?.name).toBe('Audrey');
  });

  it('never substitutes a different language: no French voice means no voice at all', () => {
    const voices = [voice('it-IT', 'Alice', true), voice('en-US', 'Samantha')];
    const selection = selectSpeechVoice(voices, 'fr-FR');
    expect(selection.match).toBe('none');
    expect(selection.voice).toBeNull();
  });

  it('handles an empty, null or malformed voice list without throwing', () => {
    expect(selectSpeechVoice([], 'de-DE')).toEqual({ voice: null, match: 'none' });
    expect(selectSpeechVoice(null, 'de-DE')).toEqual({ voice: null, match: 'none' });
    expect(selectSpeechVoice(undefined, 'de-DE')).toEqual({ voice: null, match: 'none' });
    expect(
      selectSpeechVoice([{ lang: '' } as SpeechVoiceLike, voice('de-DE', 'Anna')], 'de-DE').voice
        ?.name,
    ).toBe('Anna');
  });

  it('returns no voice when the requested language is missing or empty', () => {
    expect(selectSpeechVoice([voice('it-IT', 'Alice')], '').match).toBe('none');
  });
});
