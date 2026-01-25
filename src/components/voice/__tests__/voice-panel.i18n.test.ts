/**
 * Test: voice-panel i18n translations
 *
 * Verifies that all hardcoded Italian strings in voice-panel.tsx
 * have corresponding translation keys in all 5 language files.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect, beforeAll } from "vitest";

type MessageFile = Record<string, any>;

function getMessageFile(locale: string): MessageFile {
  const path = resolve(
    __dirname,
    `../../..`,
    "i18n",
    "messages",
    `${locale}.json`,
  );
  const content = readFileSync(path, "utf-8");
  return JSON.parse(content);
}

describe("voice-panel i18n", () => {
  const locales = ["it", "en", "fr", "de", "es"];
  const messages: Record<string, MessageFile> = {};

  beforeAll(() => {
    locales.forEach((locale) => {
      messages[locale] = getMessageFile(locale);
    });
  });

  describe("voice namespace exists", () => {
    locales.forEach((locale) => {
      it(`should have voice namespace in ${locale}`, () => {
        expect(messages[locale]).toHaveProperty("voice");
        expect(typeof messages[locale].voice).toBe("object");
      });
    });
  });

  describe("all voice keys match across locales", () => {
    it("should have identical key structure in all locales", () => {
      const itKeys = Object.keys(messages.it.voice || {}).sort();

      locales.slice(1).forEach((locale) => {
        const localeKeys = Object.keys(messages[locale].voice || {}).sort();
        expect(localeKeys, `${locale} has different keys than Italian`).toEqual(
          itKeys,
        );
      });
    });
  });

  describe("voice.panel keys", () => {
    const requiredKeys = [
      "voice.panel.connecting",
      "voice.panel.speaking",
      "voice.panel.listening",
      "voice.panel.connected",
      "voice.panel.startingCall",
      "voice.panel.mutedLabel",
      "voice.panel.unmuteLabel",
      "voice.panel.muteLabel",
      "voice.panel.microphoneDisabled",
      "voice.panel.speakNow",
    ];

    requiredKeys.forEach((key) => {
      locales.forEach((locale) => {
        it(`should have ${key} in ${locale}`, () => {
          const keys = key.split(".");
          let value: any = messages[locale];

          for (const k of keys) {
            expect(value).toHaveProperty(k);
            value = value[k];
          }

          expect(typeof value).toBe("string");
          expect(value).toBeTruthy();
        });
      });
    });
  });

  describe("session-controls keys", () => {
    const requiredKeys = [
      "session.controls.muteTooltip.muted",
      "session.controls.muteTooltip.unmuted",
      "session.controls.muteAriaLabel.muted",
      "session.controls.muteAriaLabel.unmuted",
      "session.controls.cancelResponseTooltip",
      "session.controls.cancelResponseAriaLabel",
      "session.controls.sendMessageTooltip",
      "session.controls.sendMessageAriaLabel",
      "session.controls.switchToChatTooltip",
      "session.controls.switchToChatAriaLabel",
      "session.controls.endSessionTooltip",
      "session.controls.endSessionAriaLabel",
      "session.controls.inputPlaceholder",
      "session.controls.sendButton",
    ];

    requiredKeys.forEach((key) => {
      locales.forEach((locale) => {
        it(`should have ${key} in ${locale}`, () => {
          const keys = key.split(".");
          let value: any = messages[locale];

          for (const k of keys) {
            expect(value).toHaveProperty(k);
            value = value[k];
          }

          expect(typeof value).toBe("string");
          expect(value).toBeTruthy();
        });
      });
    });
  });

  describe("onboarding keys", () => {
    const requiredKeys = [
      "onboarding.transcript.conversationTitle",
      "onboarding.transcript.messageSingular",
      "onboarding.transcript.messagePlural",
      "onboarding.transcript.noConversation",
      "onboarding.transcript.userLabel",
      "onboarding.transcript.conversationActive",
      "voice.microphoneUnauthorized",
      "voice.connectionError",
      "onboarding.checklist.nameLabel",
      "onboarding.checklist.ageLabel",
      "onboarding.checklist.schoolLabel",
      "onboarding.checklist.schoolElementary",
      "onboarding.checklist.schoolMiddle",
      "onboarding.checklist.schoolHigh",
      "onboarding.checklist.differencesLabel",
      "onboarding.checklist.differencesCount",
    ];

    requiredKeys.forEach((key) => {
      locales.forEach((locale) => {
        it(`should have ${key} in ${locale}`, () => {
          const keys = key.split(".");
          let value: any = messages[locale];

          for (const k of keys) {
            expect(value).toHaveProperty(k);
            value = value[k];
          }

          expect(typeof value).toBe("string");
          expect(value).toBeTruthy();
        });
      });
    });
  });
});
