import { describe, expect, it } from 'vitest';
import {
  AiProvider,
  FontSize,
  ProfileUpdateSchema,
  SettingsUpdateSchema,
} from '../schemas/user';
import { VALIDATION_LIMITS } from '../common';

describe('User Validation Schemas', () => {
  describe('AiProvider', () => {
    it('accepts valid providers', () => {
      expect(AiProvider.parse('azure')).toBe('azure');
      expect(AiProvider.parse('ollama')).toBe('ollama');
    });

    it('rejects invalid providers', () => {
      expect(() => AiProvider.parse('openai')).toThrow();
      expect(() => AiProvider.parse('invalid')).toThrow();
      expect(() => AiProvider.parse('')).toThrow();
    });
  });

  describe('FontSize', () => {
    it('accepts all valid font sizes', () => {
      const validSizes = ['small', 'medium', 'large', 'extra-large'];
      validSizes.forEach(size => {
        expect(FontSize.parse(size)).toBe(size);
      });
    });

    it('rejects invalid font sizes', () => {
      expect(() => FontSize.parse('tiny')).toThrow();
      expect(() => FontSize.parse('huge')).toThrow();
      expect(() => FontSize.parse('')).toThrow();
    });
  });

  describe('ProfileUpdateSchema', () => {
    it('accepts empty object (all fields optional)', () => {
      expect(() => ProfileUpdateSchema.parse({})).not.toThrow();
    });

    it('accepts valid name', () => {
      const validProfile = { name: 'John Doe' };
      expect(() => ProfileUpdateSchema.parse(validProfile)).not.toThrow();
    });

    it('rejects name exceeding max length', () => {
      const invalidProfile = {
        name: 'a'.repeat(VALIDATION_LIMITS.SHORT_STRING_MAX + 1),
      };
      expect(() => ProfileUpdateSchema.parse(invalidProfile)).toThrow();
    });

    it('accepts valid age within bounds', () => {
      expect(() => ProfileUpdateSchema.parse({ age: VALIDATION_LIMITS.MIN_AGE })).not.toThrow();
      expect(() => ProfileUpdateSchema.parse({ age: VALIDATION_LIMITS.MAX_AGE })).not.toThrow();
      expect(() => ProfileUpdateSchema.parse({ age: 15 })).not.toThrow();
    });

    it('rejects age outside bounds', () => {
      expect(() => ProfileUpdateSchema.parse({ age: VALIDATION_LIMITS.MIN_AGE - 1 })).toThrow();
      expect(() => ProfileUpdateSchema.parse({ age: VALIDATION_LIMITS.MAX_AGE + 1 })).toThrow();
    });

    it('rejects non-integer age', () => {
      expect(() => ProfileUpdateSchema.parse({ age: 15.5 })).toThrow();
    });

    it('accepts valid schoolYear within bounds', () => {
      expect(() => ProfileUpdateSchema.parse({ schoolYear: VALIDATION_LIMITS.MIN_SCHOOL_YEAR })).not.toThrow();
      expect(() => ProfileUpdateSchema.parse({ schoolYear: VALIDATION_LIMITS.MAX_SCHOOL_YEAR })).not.toThrow();
      expect(() => ProfileUpdateSchema.parse({ schoolYear: 7 })).not.toThrow();
    });

    it('rejects schoolYear outside bounds', () => {
      expect(() => ProfileUpdateSchema.parse({ schoolYear: 0 })).toThrow();
      expect(() => ProfileUpdateSchema.parse({ schoolYear: 14 })).toThrow();
    });

    it('accepts valid schoolLevel', () => {
      expect(() => ProfileUpdateSchema.parse({ schoolLevel: 'elementare' })).not.toThrow();
      expect(() => ProfileUpdateSchema.parse({ schoolLevel: 'media' })).not.toThrow();
      expect(() => ProfileUpdateSchema.parse({ schoolLevel: 'superiore' })).not.toThrow();
    });

    it('rejects invalid schoolLevel', () => {
      expect(() => ProfileUpdateSchema.parse({ schoolLevel: 'university' })).toThrow();
    });

    it('accepts valid gradeLevel', () => {
      const validProfile = { gradeLevel: '5th Grade' };
      expect(() => ProfileUpdateSchema.parse(validProfile)).not.toThrow();
    });

    it('rejects gradeLevel exceeding max length', () => {
      const invalidProfile = { gradeLevel: 'a'.repeat(21) };
      expect(() => ProfileUpdateSchema.parse(invalidProfile)).toThrow();
    });

    it('accepts valid learningGoals array', () => {
      const validProfile = {
        learningGoals: ['Improve math', 'Learn history', 'Practice reading'],
      };
      expect(() => ProfileUpdateSchema.parse(validProfile)).not.toThrow();
    });

    it('rejects learningGoals exceeding max array size', () => {
      const invalidProfile = {
        learningGoals: Array(VALIDATION_LIMITS.SMALL_ARRAY_MAX + 1).fill('Goal'),
      };
      expect(() => ProfileUpdateSchema.parse(invalidProfile)).toThrow();
    });

    it('rejects learningGoals with items exceeding max length', () => {
      const invalidProfile = {
        learningGoals: ['a'.repeat(201)],
      };
      expect(() => ProfileUpdateSchema.parse(invalidProfile)).toThrow();
    });

    it('accepts valid preferredCoach', () => {
      const validCoaches = ['melissa', 'roberto', 'chiara', 'andrea', 'favij'];
      validCoaches.forEach(coach => {
        expect(() => ProfileUpdateSchema.parse({ preferredCoach: coach })).not.toThrow();
      });
    });

    it('accepts null preferredCoach', () => {
      expect(() => ProfileUpdateSchema.parse({ preferredCoach: null })).not.toThrow();
    });

    it('rejects invalid preferredCoach', () => {
      expect(() => ProfileUpdateSchema.parse({ preferredCoach: 'john' })).toThrow();
    });

    it('accepts valid preferredBuddy', () => {
      const validBuddies = ['mario', 'noemi', 'enea', 'bruno', 'sofia'];
      validBuddies.forEach(buddy => {
        expect(() => ProfileUpdateSchema.parse({ preferredBuddy: buddy })).not.toThrow();
      });
    });

    it('accepts null preferredBuddy', () => {
      expect(() => ProfileUpdateSchema.parse({ preferredBuddy: null })).not.toThrow();
    });

    it('rejects invalid preferredBuddy', () => {
      expect(() => ProfileUpdateSchema.parse({ preferredBuddy: 'lucy' })).toThrow();
    });

    it('accepts complete valid profile', () => {
      const validProfile = {
        name: 'Alice Johnson',
        age: 12,
        schoolYear: 7,
        schoolLevel: 'media' as const,
        gradeLevel: '7th Grade',
        learningGoals: ['Improve math', 'Learn science'],
        preferredCoach: 'melissa' as const,
        preferredBuddy: 'sofia' as const,
      };
      expect(() => ProfileUpdateSchema.parse(validProfile)).not.toThrow();
    });

    it('rejects extra fields due to strict mode', () => {
      const invalidProfile = {
        name: 'John',
        extraField: 'not allowed',
      };
      expect(() => ProfileUpdateSchema.parse(invalidProfile)).toThrow();
    });
  });

  describe('SettingsUpdateSchema', () => {
    it('accepts empty object (all fields optional)', () => {
      expect(() => SettingsUpdateSchema.parse({})).not.toThrow();
    });

    it('accepts valid theme', () => {
      expect(() => SettingsUpdateSchema.parse({ theme: 'light' })).not.toThrow();
      expect(() => SettingsUpdateSchema.parse({ theme: 'dark' })).not.toThrow();
      expect(() => SettingsUpdateSchema.parse({ theme: 'system' })).not.toThrow();
    });

    it('rejects invalid theme', () => {
      expect(() => SettingsUpdateSchema.parse({ theme: 'blue' })).toThrow();
    });

    it('accepts valid language', () => {
      const validSettings = { language: 'en' };
      expect(() => SettingsUpdateSchema.parse(validSettings)).not.toThrow();
    });

    it('rejects language exceeding max length', () => {
      const invalidSettings = { language: 'a'.repeat(11) };
      expect(() => SettingsUpdateSchema.parse(invalidSettings)).toThrow();
    });

    it('accepts valid accentColor', () => {
      const validSettings = { accentColor: '#FF5733' };
      expect(() => SettingsUpdateSchema.parse(validSettings)).not.toThrow();
    });

    it('rejects accentColor exceeding max length', () => {
      const invalidSettings = { accentColor: 'a'.repeat(21) };
      expect(() => SettingsUpdateSchema.parse(invalidSettings)).toThrow();
    });

    it('accepts valid provider', () => {
      expect(() => SettingsUpdateSchema.parse({ provider: 'azure' })).not.toThrow();
      expect(() => SettingsUpdateSchema.parse({ provider: 'ollama' })).not.toThrow();
    });

    it('rejects invalid provider', () => {
      expect(() => SettingsUpdateSchema.parse({ provider: 'openai' })).toThrow();
    });

    it('accepts valid model', () => {
      const validSettings = { model: 'gpt-4' };
      expect(() => SettingsUpdateSchema.parse(validSettings)).not.toThrow();
    });

    it('rejects model exceeding max length', () => {
      const invalidSettings = { model: 'a'.repeat(51) };
      expect(() => SettingsUpdateSchema.parse(invalidSettings)).toThrow();
    });

    it('accepts valid budgetLimit within bounds', () => {
      expect(() => SettingsUpdateSchema.parse({ budgetLimit: 0 })).not.toThrow();
      expect(() => SettingsUpdateSchema.parse({ budgetLimit: 10000 })).not.toThrow();
      expect(() => SettingsUpdateSchema.parse({ budgetLimit: 500 })).not.toThrow();
    });

    it('rejects budgetLimit outside bounds', () => {
      expect(() => SettingsUpdateSchema.parse({ budgetLimit: -1 })).toThrow();
      expect(() => SettingsUpdateSchema.parse({ budgetLimit: 10001 })).toThrow();
    });

    it('accepts valid totalSpent', () => {
      expect(() => SettingsUpdateSchema.parse({ totalSpent: 0 })).not.toThrow();
      expect(() => SettingsUpdateSchema.parse({ totalSpent: 1000 })).not.toThrow();
    });

    it('rejects negative totalSpent', () => {
      expect(() => SettingsUpdateSchema.parse({ totalSpent: -1 })).toThrow();
    });

    it('accepts valid fontSize', () => {
      const validSizes = ['small', 'medium', 'large', 'extra-large'];
      validSizes.forEach(size => {
        expect(() => SettingsUpdateSchema.parse({ fontSize: size })).not.toThrow();
      });
    });

    it('rejects invalid fontSize', () => {
      expect(() => SettingsUpdateSchema.parse({ fontSize: 'huge' })).toThrow();
    });

    it('accepts all boolean accessibility settings', () => {
      const validSettings = {
        highContrast: true,
        dyslexiaFont: false,
        reducedMotion: true,
        voiceEnabled: false,
        simplifiedLanguage: true,
        adhdMode: false,
      };
      expect(() => SettingsUpdateSchema.parse(validSettings)).not.toThrow();
    });

    it('rejects non-boolean accessibility settings', () => {
      expect(() => SettingsUpdateSchema.parse({ highContrast: 'true' })).toThrow();
      expect(() => SettingsUpdateSchema.parse({ dyslexiaFont: 1 })).toThrow();
    });

    it('accepts complete valid settings', () => {
      const validSettings = {
        theme: 'dark' as const,
        language: 'en',
        accentColor: '#FF5733',
        provider: 'azure' as const,
        model: 'gpt-4',
        budgetLimit: 500,
        totalSpent: 100,
        fontSize: 'medium' as const,
        highContrast: true,
        dyslexiaFont: true,
        reducedMotion: false,
        voiceEnabled: true,
        simplifiedLanguage: false,
        adhdMode: true,
      };
      expect(() => SettingsUpdateSchema.parse(validSettings)).not.toThrow();
    });

    it('rejects extra fields due to strict mode', () => {
      const invalidSettings = {
        theme: 'light',
        extraField: 'not allowed',
      };
      expect(() => SettingsUpdateSchema.parse(invalidSettings)).toThrow();
    });
  });
});
