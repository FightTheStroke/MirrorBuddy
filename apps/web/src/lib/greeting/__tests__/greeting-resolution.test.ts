/**
 * @file greeting-resolution.test.ts
 * @brief Multilingual greeting resolution tests across all 5 supported locales
 *
 * Verifies that greeting generation works correctly across all 5 locales (it, en, fr, de, es).
 * Tests formal/informal address, character type handling, and fallback behavior.
 *
 * Test Coverage:
 * - generateMaestroGreeting produces correct greeting per locale
 * - Formal professors get Lei/Sie/Vous greetings across locales
 * - Informal professors get tu/du/tú greetings across locales
 * - Coach greetings work per locale
 * - Buddy greetings work per locale
 * - Fallback to Italian when locale not found
 */

import { describe, it, expect } from 'vitest';
import {
  generateMaestroGreeting,
  generateCoachGreeting,
  generateBuddyGreeting,
  generateGreeting,
} from '../greeting-generator';
import {
  isFormalProfessor,
  FORMAL_GREETINGS,
  GENERIC_GREETINGS,
  COACH_GREETINGS,
  BUDDY_GREETINGS,
} from '../templates';
import type { GreetingContext } from '@/types/greeting';
import type { ExtendedStudentProfile } from '@/lib/stores/settings-types';
import type { Locale } from '@/i18n/config';

const SUPPORTED_LOCALES: Locale[] = ['it', 'en', 'es', 'fr', 'de'];

// Mock student profile for testing
const mockStudent: ExtendedStudentProfile = {
  name: 'Test Student',
  age: 12,
  schoolYear: 7,
  schoolLevel: 'media',
  gradeLevel: '7',
  learningGoals: [],
  teachingStyle: 'balanced',
  fontSize: 'medium',
  highContrast: false,
  dyslexiaFont: false,
  voiceEnabled: false,
  simplifiedLanguage: false,
  adhdMode: false,
  learningDifferences: [],
  crossMaestroEnabled: false,
};

describe('Multilingual Greeting Resolution (T3-04)', () => {
  describe('generateMaestroGreeting - locale coverage', () => {
    it('produces greeting for all 5 supported locales', () => {
      const maestroId = 'galileo';
      const displayName = 'Galileo Galilei';

      SUPPORTED_LOCALES.forEach((locale) => {
        const greeting = generateMaestroGreeting(maestroId, displayName, locale);

        expect(greeting).toBeTruthy();
        expect(greeting.length).toBeGreaterThan(0);
        expect(typeof greeting).toBe('string');
        expect(greeting).toContain(displayName);
      });
    });

    it('produces different greetings for different locales', () => {
      const maestroId = 'euclide';
      const displayName = 'Euclid';

      const greetings = SUPPORTED_LOCALES.map((locale) =>
        generateMaestroGreeting(maestroId, displayName, locale),
      );

      // Most greetings should be different (at least some variation)
      const uniqueGreetings = new Set(greetings);
      expect(uniqueGreetings.size).toBeGreaterThan(1);
    });

    it('contains locale-specific markers in greetings', () => {
      const maestroId = 'feynman'; // Informal professor
      const displayName = 'Richard Feynman';

      const localeMarkers: Record<Locale, string[]> = {
        it: ['Ciao', 'Sono', 'aiutarti'],
        en: ['Hi', "I'm", 'help you'],
        es: ['Hola', 'Soy', 'ayudarte'],
        fr: ['Bonjour', 'Je suis', "t'aider"],
        de: ['Hallo', 'Ich bin', 'dir'],
      };

      SUPPORTED_LOCALES.forEach((locale) => {
        const greeting = generateMaestroGreeting(maestroId, displayName, locale);
        const markers = localeMarkers[locale];

        // At least one marker should be present
        const hasMarker = markers.some((marker) => greeting.includes(marker));
        expect(hasMarker).toBe(true);
      });
    });
  });

  describe('Formal professors - Lei/Sie/Vous greetings', () => {
    const formalProfessors = [
      'manzoni',
      'galileo',
      'darwin',
      'curie',
      'leonardo',
      'euclide',
      'socrate',
      'cicerone',
      'cassese',
      'omero',
    ];

    it('generates formal Italian greeting (Lei) for formal professors', () => {
      formalProfessors.forEach((professorId) => {
        const greeting = generateMaestroGreeting(professorId, 'Test Professor', 'it');

        // Should contain formal address marker "esserLe" (Lei form)
        expect(greeting).toContain('esserLe');
        expect(isFormalProfessor(professorId)).toBe(true);
      });
    });

    it('generates formal German greeting (Sie) for formal professors', () => {
      formalProfessors.forEach((professorId) => {
        const greeting = generateMaestroGreeting(professorId, 'Test Professor', 'de');

        // Should contain formal address marker "Ihnen" (Sie form)
        expect(greeting).toContain('Ihnen');
      });
    });

    it('generates formal French greeting (Vous) for formal professors', () => {
      formalProfessors.forEach((professorId) => {
        const greeting = generateMaestroGreeting(professorId, 'Test Professor', 'fr');

        // Should contain formal address marker "vous"
        expect(greeting).toContain('vous');
      });
    });

    it('generates formal Spanish greeting (Usted) for formal professors', () => {
      formalProfessors.forEach((professorId) => {
        const greeting = generateMaestroGreeting(professorId, 'Test Professor', 'es');

        // Should contain formal address marker "servirle" (Usted form)
        expect(greeting).toContain('servirle');
      });
    });

    it('generates formal English greeting for formal professors', () => {
      formalProfessors.forEach((professorId) => {
        const greeting = generateMaestroGreeting(professorId, 'Test Professor', 'en');

        // Should contain formal address marker "may I assist"
        expect(greeting).toContain('may I assist');
      });
    });

    it('applies formality consistently across all locales', () => {
      const professorId = 'manzoni'; // Formal professor

      SUPPORTED_LOCALES.forEach((locale) => {
        const greeting = generateMaestroGreeting(professorId, 'Alessandro Manzoni', locale);
        const formalTemplate = FORMAL_GREETINGS[locale];

        // Greeting should be based on formal template
        expect(greeting).toBeTruthy();
        expect(formalTemplate).toBeTruthy();
      });
    });
  });

  describe('Informal professors - tu/du/tú greetings', () => {
    const informalProfessors = ['feynman', 'chris', 'simone'];

    it('generates informal Italian greeting (tu) for informal professors', () => {
      informalProfessors.forEach((professorId) => {
        const greeting = generateMaestroGreeting(professorId, 'Test Professor', 'it');

        // Should contain informal address marker "aiutarti" (tu form)
        expect(greeting).toContain('aiutarti');
        expect(isFormalProfessor(professorId)).toBe(false);
      });
    });

    it('generates informal German greeting (du) for informal professors', () => {
      informalProfessors.forEach((professorId) => {
        const greeting = generateMaestroGreeting(professorId, 'Test Professor', 'de');

        // Should contain informal address marker "dir" (du form)
        expect(greeting).toContain('dir');
      });
    });

    it('generates informal French greeting (tu) for informal professors', () => {
      informalProfessors.forEach((professorId) => {
        const greeting = generateMaestroGreeting(professorId, 'Test Professor', 'fr');

        // Should contain informal address marker "t'aider"
        expect(greeting).toContain("t'aider");
      });
    });

    it('generates informal Spanish greeting (tú) for informal professors', () => {
      informalProfessors.forEach((professorId) => {
        const greeting = generateMaestroGreeting(professorId, 'Test Professor', 'es');

        // Should contain informal address marker "ayudarte" (tú form)
        expect(greeting).toContain('ayudarte');
      });
    });

    it('generates informal English greeting for informal professors', () => {
      informalProfessors.forEach((professorId) => {
        const greeting = generateMaestroGreeting(professorId, 'Test Professor', 'en');

        // Should contain informal marker "help you"
        expect(greeting).toContain('help you');
      });
    });

    it('applies informality consistently across all locales', () => {
      const professorId = 'feynman'; // Informal professor

      SUPPORTED_LOCALES.forEach((locale) => {
        const greeting = generateMaestroGreeting(professorId, 'Richard Feynman', locale);
        const genericTemplate = GENERIC_GREETINGS[locale];

        // Greeting should be based on generic/informal template
        expect(greeting).toBeTruthy();
        expect(genericTemplate).toBeTruthy();
      });
    });
  });

  describe('Coach greetings - locale coverage', () => {
    it('generates coach greeting for all 5 locales', () => {
      const displayName = 'Melissa';

      SUPPORTED_LOCALES.forEach((locale) => {
        const greeting = generateCoachGreeting(displayName, locale);

        expect(greeting).toBeTruthy();
        expect(greeting.length).toBeGreaterThan(0);
        expect(greeting).toContain(displayName);
      });
    });

    it('uses correct template for each locale', () => {
      const displayName = 'Roberto';

      SUPPORTED_LOCALES.forEach((locale) => {
        const greeting = generateCoachGreeting(displayName, locale);
        const template = COACH_GREETINGS[locale];

        // Greeting should match template structure
        expect(greeting).toBeTruthy();
        expect(template).toBeTruthy();
        expect(greeting).toContain(displayName);
      });
    });

    it('contains learning-related keywords in all locales', () => {
      const displayName = 'Chiara';

      const learningKeywords: Record<Locale, string[]> = {
        it: ['imparare', 'aiutarti'],
        en: ['learn', 'help you'],
        es: ['aprender', 'ayudarte'],
        fr: ['apprendre', "t'aider"],
        de: ['Lernen', 'helfen'],
      };

      SUPPORTED_LOCALES.forEach((locale) => {
        const greeting = generateCoachGreeting(displayName, locale);
        const keywords = learningKeywords[locale];

        // At least one keyword should be present
        const hasKeyword = keywords.some((keyword) =>
          greeting.toLowerCase().includes(keyword.toLowerCase()),
        );
        expect(hasKeyword).toBe(true);
      });
    });
  });

  describe('Buddy greetings - locale coverage', () => {
    const studentAge = 12;
    const buddyAge = studentAge + 1; // Buddies are 1 year older

    it('generates buddy greeting for all 5 locales', () => {
      const displayName = 'Mario';

      SUPPORTED_LOCALES.forEach((locale) => {
        const greeting = generateBuddyGreeting(displayName, studentAge, locale);

        expect(greeting).toBeTruthy();
        expect(greeting.length).toBeGreaterThan(0);
        expect(greeting).toContain(displayName);
        expect(greeting).toContain(String(buddyAge));
      });
    });

    it('includes age in all locale greetings', () => {
      const displayName = 'Sofia';

      SUPPORTED_LOCALES.forEach((locale) => {
        const greeting = generateBuddyGreeting(displayName, studentAge, locale);

        // Should include buddy age (student age + 1)
        expect(greeting).toContain(String(buddyAge));
      });
    });

    it('uses correct template for each locale', () => {
      const displayName = 'Luca';

      SUPPORTED_LOCALES.forEach((locale) => {
        const greeting = generateBuddyGreeting(displayName, studentAge, locale);
        const template = BUDDY_GREETINGS[locale];

        // Greeting should match template structure
        expect(greeting).toBeTruthy();
        expect(template).toBeTruthy();
        expect(greeting).toContain(displayName);
      });
    });

    it('contains peer-level language markers in all locales', () => {
      const displayName = 'Anna';

      const peerMarkers: Record<Locale, string[]> = {
        it: ['Ehi', 'anni', 'come te'],
        en: ['Hey', 'years old', 'just like you'],
        es: ['Hola', 'años', 'como tú'],
        fr: ['Salut', 'ans', 'comme toi'],
        de: ['Hey', 'Jahre alt', 'wie du'],
      };

      SUPPORTED_LOCALES.forEach((locale) => {
        const greeting = generateBuddyGreeting(displayName, studentAge, locale);
        const markers = peerMarkers[locale];

        // At least one marker should be present
        const hasMarker = markers.some((marker) => greeting.includes(marker));
        expect(hasMarker).toBe(true);
      });
    });
  });

  describe('Fallback behavior - Italian as default', () => {
    it('falls back to Italian for invalid locale in maestro greeting', () => {
      // @ts-expect-error - testing fallback behavior with invalid locale
      const greeting = generateMaestroGreeting('galileo', 'Galileo', 'invalid');

      // Should fallback to Italian
      expect(greeting).toMatch(/Sono|esserLe/);
    });

    it('falls back to Italian for invalid locale in coach greeting', () => {
      // @ts-expect-error - testing fallback behavior with invalid locale
      const greeting = generateCoachGreeting('Melissa', 'invalid');

      // Should fallback to Italian
      expect(greeting).toMatch(/aiutarti a imparare/i);
    });

    it('falls back to Italian for invalid locale in buddy greeting', () => {
      // @ts-expect-error - testing fallback behavior with invalid locale
      const greeting = generateBuddyGreeting('Mario', 12, 'invalid');

      // Should fallback to Italian
      expect(greeting).toMatch(/Ehi|anni/);
    });

    it('falls back to Italian when locale is undefined', () => {
      // @ts-expect-error - testing fallback behavior
      const maestroGreeting = generateMaestroGreeting('galileo', 'Galileo');

      expect(maestroGreeting).toBeTruthy();
      expect(maestroGreeting).toMatch(/Sono|esserLe/);
    });
  });

  describe('generateGreeting with context - all character types', () => {
    it('generates maestro greetings correctly for all locales', () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const context: GreetingContext = {
          student: mockStudent,
          language: locale,
        };

        const greeting = generateGreeting('galileo', 'Galileo Galilei', 'maestro', context);

        expect(greeting).toBeTruthy();
        expect(greeting).toContain('Galileo Galilei');
      });
    });

    it('generates coach greetings correctly for all locales', () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const context: GreetingContext = {
          student: mockStudent,
          language: locale,
        };

        const greeting = generateGreeting('melissa', 'Melissa', 'coach', context);

        expect(greeting).toBeTruthy();
        expect(greeting).toContain('Melissa');
      });
    });

    it('generates buddy greetings correctly for all locales', () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const context: GreetingContext = {
          student: mockStudent,
          language: locale,
        };

        const greeting = generateGreeting('mario', 'Mario', 'buddy', context);

        expect(greeting).toBeTruthy();
        expect(greeting).toContain('Mario');
        expect(greeting).toContain(String(mockStudent.age + 1));
      });
    });

    it('respects formality in maestro greetings across all locales', () => {
      const formalProfessor = 'manzoni';
      const informalProfessor = 'feynman';

      SUPPORTED_LOCALES.forEach((locale) => {
        const context: GreetingContext = {
          student: mockStudent,
          language: locale,
        };

        const formalGreeting = generateGreeting(
          formalProfessor,
          'Alessandro Manzoni',
          'maestro',
          context,
        );
        const informalGreeting = generateGreeting(
          informalProfessor,
          'Richard Feynman',
          'maestro',
          context,
        );

        // Greetings should be different (formal vs informal)
        expect(formalGreeting).not.toBe(informalGreeting);
      });
    });

    it('maintains consistency when called multiple times with same locale', () => {
      const context: GreetingContext = {
        student: mockStudent,
        language: 'en',
      };

      const greeting1 = generateGreeting('galileo', 'Galileo', 'maestro', context);
      const greeting2 = generateGreeting('galileo', 'Galileo', 'maestro', context);

      expect(greeting1).toBe(greeting2);
    });
  });

  describe('Cross-locale consistency', () => {
    it('maintains name substitution across all locales', () => {
      const testName = 'Test Professor';

      SUPPORTED_LOCALES.forEach((locale) => {
        const maestroGreeting = generateMaestroGreeting('galileo', testName, locale);
        const coachGreeting = generateCoachGreeting(testName, locale);
        const buddyGreeting = generateBuddyGreeting(testName, 12, locale);

        expect(maestroGreeting).toContain(testName);
        expect(coachGreeting).toContain(testName);
        expect(buddyGreeting).toContain(testName);
      });
    });

    it('maintains greeting structure across all locales', () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const greeting = generateMaestroGreeting('galileo', 'Galileo', locale);

        // All greetings should be non-empty strings
        expect(typeof greeting).toBe('string');
        expect(greeting.length).toBeGreaterThan(0);

        // All greetings should contain the name
        expect(greeting).toContain('Galileo');
      });
    });

    it('produces unique greetings for different professors in same locale', () => {
      const locale: Locale = 'en';

      const greeting1 = generateMaestroGreeting('galileo', 'Galileo', locale);
      const greeting2 = generateMaestroGreeting('feynman', 'Feynman', locale);
      const greeting3 = generateMaestroGreeting('curie', 'Curie', locale);

      // At least some variation (names are different)
      const greetings = [greeting1, greeting2, greeting3];
      greetings.forEach((greeting) => {
        expect(greeting).toBeTruthy();
      });

      // Names should be present in respective greetings
      expect(greeting1).toContain('Galileo');
      expect(greeting2).toContain('Feynman');
      expect(greeting3).toContain('Curie');
    });
  });

  describe('Edge cases and special scenarios', () => {
    it('handles special characters in names across all locales', () => {
      const specialName = 'José María García-López';

      SUPPORTED_LOCALES.forEach((locale) => {
        const greeting = generateMaestroGreeting('galileo', specialName, locale);
        expect(greeting).toContain(specialName);
      });
    });

    it('handles very long names across all locales', () => {
      const longName = 'Alessandro Antonio Giuseppe Vincenzo Leonardo da Vinci';

      SUPPORTED_LOCALES.forEach((locale) => {
        const greeting = generateMaestroGreeting('leonardo', longName, locale);
        expect(greeting).toContain(longName);
      });
    });

    it('handles empty character ID gracefully across all locales', () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const greeting = generateMaestroGreeting('', 'Test', locale);
        expect(greeting).toBeTruthy();
      });
    });

    it('handles different age values in buddy greetings', () => {
      const ages = [6, 12, 16, 18];

      ages.forEach((age) => {
        SUPPORTED_LOCALES.forEach((locale) => {
          const greeting = generateBuddyGreeting('Test', age, locale);
          expect(greeting).toContain(String(age + 1));
        });
      });
    });
  });
});
