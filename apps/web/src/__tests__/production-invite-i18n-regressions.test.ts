import { describe, expect, it } from 'vitest';

import deAuth from '../../messages/de/auth.json';
import enAuth from '../../messages/en/auth.json';
import esAuth from '../../messages/es/auth.json';
import frAuth from '../../messages/fr/auth.json';
import itAuth from '../../messages/it/auth.json';

const inviteMessages = {
  de: deAuth.auth.invite,
  en: enAuth.auth.invite,
  es: esAuth.auth.invite,
  fr: frAuth.auth.invite,
  it: itAuth.auth.invite,
};

const expectedInviteCopy = {
  de: {
    pageTitle: 'Beta-Zugang anfordern',
    pageDescription:
      'MirrorBuddy befindet sich in privater Betaversion. Füllen Sie das Formular aus, um Zugang anzufordern.',
    minimumCharacters: 'Mindestens 20 Zeichen',
    confirmationText:
      'Sie erhalten eine Bestätigungs-E-Mail und, falls genehmigt, Ihre Zugangsdaten.',
  },
  en: {
    pageTitle: 'Request Beta Access',
    pageDescription: 'MirrorBuddy is in private beta. Fill out the form to request access.',
    minimumCharacters: 'Minimum 20 characters',
    confirmationText:
      'You will receive a confirmation email and, if approved, your access credentials.',
  },
  es: {
    pageTitle: 'Solicitar Acceso a Beta',
    pageDescription:
      'MirrorBuddy está en beta privada. Complete el formulario para solicitar acceso.',
    minimumCharacters: 'Mínimo 20 caracteres',
    confirmationText:
      'Recibirás un correo de confirmación y, si se aprueba, tus credenciales de acceso.',
  },
  fr: {
    pageTitle: "Demander l'Accès Bêta",
    pageDescription:
      "MirrorBuddy est en bêta privée. Remplissez le formulaire pour demander l'accès.",
    minimumCharacters: 'Minimum 20 caractères',
    confirmationText:
      "Vous recevrez un email de confirmation et, s'il est approuvé, vos identifiants d'accès.",
  },
  it: {
    pageTitle: 'Richiedi Accesso Beta',
    pageDescription: "MirrorBuddy è in beta privata. Compila il form per richiedere l'accesso.",
    minimumCharacters: 'Minimo 20 caratteri',
    confirmationText: 'Riceverai una email di conferma e, se approvato, le credenziali di accesso.',
  },
} as const;

describe('production invite i18n regressions', () => {
  it('uses the exact invite-request copy in every supported locale', () => {
    Object.entries(inviteMessages).forEach(([locale, messages]) => {
      expect(messages).toMatchObject(expectedInviteCopy[locale as keyof typeof expectedInviteCopy]);
    });
  });
});
