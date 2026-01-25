import { describe, it, expect } from 'vitest';
import enMessages from '../../../../messages/en.json';
import itMessages from '../../../../messages/it.json';
import esMessages from '../../../../messages/es.json';
import frMessages from '../../../../messages/fr.json';
import deMessages from '../../../../messages/de.json';

describe('Settings Localization', () => {
  describe('Message files have settings namespace', () => {
    it('should have settings namespace in en.json', () => {
      expect(enMessages).toHaveProperty('settings');
      expect(typeof enMessages.settings).toBe('object');
    });

    it('should have settings namespace in it.json', () => {
      expect(itMessages).toHaveProperty('settings');
      expect(typeof itMessages.settings).toBe('object');
    });

    it('should have settings namespace in es.json', () => {
      expect(esMessages).toHaveProperty('settings');
      expect(typeof esMessages.settings).toBe('object');
    });

    it('should have settings namespace in fr.json', () => {
      expect(frMessages).toHaveProperty('settings');
      expect(typeof frMessages.settings).toBe('object');
    });

    it('should have settings namespace in de.json', () => {
      expect(deMessages).toHaveProperty('settings');
      expect(typeof deMessages.settings).toBe('object');
    });
  });

  describe('Core settings keys exist', () => {
    const requiredKeys = [
      'title',
      'save',
      'saving',
      'saveChanges',
      'undo',
      'undoChanges',
      'tabs',
      'profile',
      'appearance',
      'accessibility',
      'notifications',
      'privacy',
    ];

    requiredKeys.forEach(key => {
      it(`should have '${key}' in all languages`, () => {
        expect(enMessages.settings).toHaveProperty(key);
        expect(itMessages.settings).toHaveProperty(key);
        expect(esMessages.settings).toHaveProperty(key);
        expect(frMessages.settings).toHaveProperty(key);
        expect(deMessages.settings).toHaveProperty(key);
      });
    });
  });

  describe('Tab labels exist', () => {
    const tabKeys = [
      'tabs.profile',
      'tabs.characters',
      'tabs.accessibility',
      'tabs.appearance',
      'tabs.ai',
      'tabs.audio',
      'tabs.ambientAudio',
      'tabs.integrations',
      'tabs.notifications',
      'tabs.telemetry',
      'tabs.privacy',
      'tabs.parents',
      'tabs.diagnostics',
    ];

    tabKeys.forEach(key => {
      it(`should have '${key}' in all languages`, () => {
        const parts = key.split('.');
        expect(enMessages.settings.tabs).toHaveProperty(parts[1]);
        expect(itMessages.settings.tabs).toHaveProperty(parts[1]);
        expect(esMessages.settings.tabs).toHaveProperty(parts[1]);
        expect(frMessages.settings.tabs).toHaveProperty(parts[1]);
        expect(deMessages.settings.tabs).toHaveProperty(parts[1]);
      });
    });
  });

  describe('Profile section keys exist', () => {
    const profileKeys = [
      'profile.personalInfo',
      'profile.name',
      'profile.namePlaceholder',
      'profile.gradeLevel',
      'profile.teachingStyle',
      'profile.teachingStyleDescription',
      'profile.adaptiveDifficulty',
      'profile.introduction',
      'profile.reviewIntroduction',
    ];

    profileKeys.forEach(key => {
      it(`should have '${key}' in all languages`, () => {
        const parts = key.split('.');
        expect(enMessages.settings.profile).toHaveProperty(parts[1]);
        expect(itMessages.settings.profile).toHaveProperty(parts[1]);
        expect(esMessages.settings.profile).toHaveProperty(parts[1]);
        expect(frMessages.settings.profile).toHaveProperty(parts[1]);
        expect(deMessages.settings.profile).toHaveProperty(parts[1]);
      });
    });
  });

  describe('Appearance section keys exist', () => {
    const appearanceKeys = [
      'appearance.theme',
      'appearance.themeLight',
      'appearance.themeDark',
      'appearance.themeSystem',
      'appearance.accentColor',
      'appearance.language',
      'appearance.languageDescription',
    ];

    appearanceKeys.forEach(key => {
      it(`should have '${key}' in all languages`, () => {
        const parts = key.split('.');
        expect(enMessages.settings.appearance).toHaveProperty(parts[1]);
        expect(itMessages.settings.appearance).toHaveProperty(parts[1]);
        expect(esMessages.settings.appearance).toHaveProperty(parts[1]);
        expect(frMessages.settings.appearance).toHaveProperty(parts[1]);
        expect(deMessages.settings.appearance).toHaveProperty(parts[1]);
      });
    });
  });

  describe('String count validation', () => {
    it('should have at least 50 strings in settings namespace', () => {
      // Count all nested strings recursively
      const countStrings = (obj: any): number => {
        let count = 0;
        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            count++;
          } else if (typeof obj[key] === 'object') {
            count += countStrings(obj[key]);
          }
        }
        return count;
      };

      const enCount = countStrings(enMessages.settings);
      expect(enCount).toBeGreaterThanOrEqual(50);
    });
  });
});
