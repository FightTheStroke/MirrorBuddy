import { describe, expect, it } from 'vitest';

import deAuth from '../../messages/de/auth.json';
import enAuth from '../../messages/en/auth.json';
import esAuth from '../../messages/es/auth.json';
import frAuth from '../../messages/fr/auth.json';
import itAuth from '../../messages/it/auth.json';
import deSettings from '../../messages/de/settings.json';
import enSettings from '../../messages/en/settings.json';
import esSettings from '../../messages/es/settings.json';
import frSettings from '../../messages/fr/settings.json';
import itSettings from '../../messages/it/settings.json';

const localeMessages = {
  de: { auth: deAuth.auth, settings: deSettings.settings },
  en: { auth: enAuth.auth, settings: enSettings.settings },
  es: { auth: esAuth.auth, settings: esSettings.settings },
  fr: { auth: frAuth.auth, settings: frSettings.settings },
  it: { auth: itAuth.auth, settings: itSettings.settings },
};

describe('production i18n regressions', () => {
  it('uses complete invite-request copy in every supported locale', () => {
    const placeholderValues = new Set([
      'Titolo della pagina',
      'Descrizione della pagina',
      'Minimo caratteri',
      'Testo di conferma',
      'Page Title',
      'Page Description',
      'Minimum Characters',
      'Confirmation Text',
    ]);

    Object.entries(localeMessages).forEach(([locale, messages]) => {
      const invite = messages.auth.invite;

      ['pageTitle', 'pageDescription', 'minimumCharacters', 'confirmationText'].forEach((key) => {
        const value = invite[key as keyof typeof invite];
        expect(value, `${locale} auth.invite.${key}`).toBeTypeOf('string');
        expect(placeholderValues, `${locale} auth.invite.${key}`).not.toContain(value);
      });
    });
  });

  it('provides every Parent Area profile label in every supported locale', () => {
    const requiredKeys = [
      'professorFallback',
      'dataDeletionRequestConfirm',
      'studentLabel',
      'activityOverview',
      'updateButton',
      'deleteButton',
      'confidenceNote',
      'settingsNote',
    ] as const;

    Object.entries(localeMessages).forEach(([locale, messages]) => {
      requiredKeys.forEach((key) => {
        expect(messages.settings.profile[key], `${locale} settings.profile.${key}`).toBeTypeOf(
          'string',
        );
      });
      expect(
        messages.settings.leOsservazioniSonoGenerate,
        `${locale} settings.leOsservazioniSonoGenerate`,
      ).toBeTypeOf('string');
    });
  });

  it('does not expose English placeholder labels in the Italian Parent Area', () => {
    expect(itSettings.settings.profile.genitori.retry).toBe('Riprova');
    expect(itSettings.settings.profile.parentChat).toMatchObject({
      askAbout: 'Chieda informazioni sui progressi di {studentName}',
      messagesSaved: 'I messaggi vengono salvati in modo sicuro',
      observationsStudySessions: 'Le osservazioni si basano sulle sessioni di studio',
      understood: 'Ho capito, continua',
    });
  });
});
