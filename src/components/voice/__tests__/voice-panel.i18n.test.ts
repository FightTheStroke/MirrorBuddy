/**
 * Test: voice-panel i18n translations
 *
 * Verifies that all hardcoded Italian strings in voice-panel.tsx
 * have corresponding translation keys in all 5 language files.
 *
 * Updated for namespace-based structure (ADR 0082)
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, beforeAll } from 'vitest';

type MessageFile = Record<string, any>;

function getMessageFile(locale: string): MessageFile {
  // Load all namespace files and merge them
  const localeDir = resolve(process.cwd(), 'messages', locale);
  const files = readdirSync(localeDir).filter((f) => f.endsWith('.json'));

  const merged: MessageFile = {};
  for (const file of files) {
    const content = readFileSync(resolve(localeDir, file), 'utf-8');
    Object.assign(merged, JSON.parse(content));
  }
  return merged;
}

describe('voice-panel i18n', () => {
  const locales = ['it', 'en', 'fr', 'de', 'es'];
  const messages: Record<string, MessageFile> = {};

  beforeAll(() => {
    locales.forEach((locale) => {
      messages[locale] = getMessageFile(locale);
    });
  });

  describe('voice namespace exists', () => {
    locales.forEach((locale) => {
      it(`should have voice namespace in ${locale}`, () => {
        expect(messages[locale]).toHaveProperty('chat');
        expect(messages[locale].chat).toHaveProperty('voice');
        expect(typeof messages[locale].chat.voice).toBe('object');
      });
    });
  });

  describe('all voice keys match across locales', () => {
    it('should have identical key structure in all locales', () => {
      const itKeys = Object.keys(messages.it.chat?.voice || {}).sort();

      locales.slice(1).forEach((locale) => {
        const localeKeys = Object.keys(messages[locale].chat?.voice || {}).sort();
        expect(localeKeys, `${locale} has different keys than Italian`).toEqual(itKeys);
      });
    });
  });

  describe('voice.panel keys', () => {
    const requiredKeys = [
      'chat.voice.panel.connecting',
      'chat.voice.panel.speaking',
      'chat.voice.panel.listening',
      'chat.voice.panel.connected',
      'chat.voice.panel.startingCall',
      'chat.voice.panel.mutedLabel',
      'chat.voice.panel.unmuteLabel',
      'chat.voice.panel.muteLabel',
      'chat.voice.panel.microphoneDisabled',
      'chat.voice.panel.speakNow',
    ];

    requiredKeys.forEach((key) => {
      locales.forEach((locale) => {
        it(`should have ${key} in ${locale}`, () => {
          const keys = key.split('.');
          let value: any = messages[locale];

          for (const k of keys) {
            expect(value).toHaveProperty(k);
            value = value[k];
          }

          expect(typeof value).toBe('string');
          expect(value).toBeTruthy();
        });
      });
    });
  });

  describe('session-controls keys', () => {
    const requiredKeys = [
      'chat.session.controls.muteTooltip.muted',
      'chat.session.controls.muteTooltip.unmuted',
      'chat.session.controls.muteAriaLabel.muted',
      'chat.session.controls.muteAriaLabel.unmuted',
      'chat.session.controls.cancelResponseTooltip',
      'chat.session.controls.cancelResponseAriaLabel',
      'chat.session.controls.sendMessageTooltip',
      'chat.session.controls.sendMessageAriaLabel',
      'chat.session.controls.switchToChatTooltip',
      'chat.session.controls.switchToChatAriaLabel',
      'chat.session.controls.endSessionTooltip',
      'chat.session.controls.endSessionAriaLabel',
      'chat.session.controls.inputPlaceholder',
      'chat.session.controls.sendButton',
    ];

    requiredKeys.forEach((key) => {
      locales.forEach((locale) => {
        it(`should have ${key} in ${locale}`, () => {
          const keys = key.split('.');
          let value: any = messages[locale];

          for (const k of keys) {
            expect(value).toHaveProperty(k);
            value = value[k];
          }

          expect(typeof value).toBe('string');
          expect(value).toBeTruthy();
        });
      });
    });
  });

  describe('onboarding keys', () => {
    const requiredKeys = [
      'welcome.onboarding.transcript.conversationTitle',
      'welcome.onboarding.transcript.messageSingular',
      'welcome.onboarding.transcript.messagePlural',
      'welcome.onboarding.transcript.noConversation',
      'welcome.onboarding.transcript.userLabel',
      'welcome.onboarding.transcript.conversationActive',
      'chat.voice.microphoneUnauthorized',
      'chat.voice.connectionError',
      'welcome.onboarding.checklist.nameLabel',
      'welcome.onboarding.checklist.ageLabel',
      'welcome.onboarding.checklist.schoolLabel',
      'welcome.onboarding.checklist.schoolElementary',
      'welcome.onboarding.checklist.schoolMiddle',
      'welcome.onboarding.checklist.schoolHigh',
      'welcome.onboarding.checklist.differencesLabel',
      'welcome.onboarding.checklist.differencesCount',
    ];

    requiredKeys.forEach((key) => {
      locales.forEach((locale) => {
        it(`should have ${key} in ${locale}`, () => {
          const keys = key.split('.');
          let value: any = messages[locale];

          for (const k of keys) {
            expect(value).toHaveProperty(k);
            value = value[k];
          }

          expect(typeof value).toBe('string');
          expect(value).toBeTruthy();
        });
      });
    });
  });
});
