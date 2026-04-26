import { describe, it, expect } from 'vitest';
import { normalizeVoiceLocale } from '../voice-locale';

describe('normalizeVoiceLocale', () => {
  it('should default to it for nullish inputs', () => {
    expect(normalizeVoiceLocale(undefined)).toBe('it');
    expect(normalizeVoiceLocale(null)).toBe('it');
  });

  it('should normalize BCP-47 locales to base language', () => {
    expect(normalizeVoiceLocale('en-US')).toBe('en');
    expect(normalizeVoiceLocale('it-IT')).toBe('it');
    expect(normalizeVoiceLocale('fr-FR')).toBe('fr');
  });

  it('should normalize underscore locales to base language', () => {
    expect(normalizeVoiceLocale('es_ES')).toBe('es');
    expect(normalizeVoiceLocale('de_DE')).toBe('de');
  });

  it('should fallback to it for unsupported locales', () => {
    expect(normalizeVoiceLocale('pt-BR')).toBe('it');
    expect(normalizeVoiceLocale('zh')).toBe('it');
  });
});
