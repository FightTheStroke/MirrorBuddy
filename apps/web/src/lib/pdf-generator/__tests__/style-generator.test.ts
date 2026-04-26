/**
 * Tests for Style Generator Utility
 * @module pdf-generator/utils/style-generator
 */

import { describe, it, expect } from 'vitest';
import { generateStyles, getColorScheme } from '../utils/style-generator';
import {
  dyslexiaProfile,
  dyscalculiaProfile,
  adhdProfile,
  dyspraxiaProfile,
  stutteringProfile,
  dysgraphiaProfile,
} from '../profiles';

describe('Style Generator', () => {
  describe('generateStyles', () => {
    it('should generate styles with A4 format by default', () => {
      const styles = generateStyles(dyslexiaProfile);
      expect(styles.page.size).toBe('A4');
      expect(styles.page.orientation).toBe('portrait');
    });

    it('should generate styles with LETTER format when specified', () => {
      const styles = generateStyles(dyslexiaProfile, 'Letter');
      expect(styles.page.size).toBe('LETTER');
    });

    it('should apply profile background color', () => {
      const dyslexiaStyles = generateStyles(dyslexiaProfile);
      expect(dyslexiaStyles.page.backgroundColor).toBe('#fffbeb');

      const dyscalculiaStyles = generateStyles(dyscalculiaProfile);
      expect(dyscalculiaStyles.page.backgroundColor).toBe('#ffffff');
    });

    it('should apply profile text color', () => {
      const styles = generateStyles(dyslexiaProfile);
      expect(styles.header.color).toBe('#1e293b');
      expect(styles.content.color).toBe('#1e293b');
    });

    it('should apply profile font settings', () => {
      const styles = generateStyles(dyslexiaProfile);
      expect(styles.content.fontFamily).toBe('Helvetica');
      expect(styles.content.fontSize).toBe(18);
      expect(styles.content.lineHeight).toBe(1.8);
      expect(styles.content.letterSpacing).toBe(0.12);
      expect(styles.content.wordSpacing).toBe(0.16);
    });

    it('should calculate header font size from heading scale', () => {
      const styles = generateStyles(dyslexiaProfile);
      expect(styles.header.fontSize).toBe(18 * 1.4); // fontSize * headingScale
    });

    it('should include footer settings', () => {
      const styles = generateStyles(dyslexiaProfile);
      expect(styles.footer.showPageNumbers).toBe(true);
      expect(styles.footer.showDate).toBe(true);
      expect(styles.footer.fontSize).toBe(10);
    });

    describe('Padding calculation', () => {
      it('should use larger padding for distractionFree profile (ADHD)', () => {
        const styles = generateStyles(adhdProfile);
        expect(styles.page.padding).toBe(50);
      });

      it('should use larger padding for extraSpacing profile (Dyslexia)', () => {
        const styles = generateStyles(dyslexiaProfile);
        expect(styles.page.padding).toBe(45);
      });

      it('should use larger padding for chunkedText profile (Dyspraxia)', () => {
        const styles = generateStyles(dyspraxiaProfile);
        expect(styles.page.padding).toBe(45);
      });

      it('should use default padding for other profiles', () => {
        const styles = generateStyles(dyscalculiaProfile);
        expect(styles.page.padding).toBe(40);
      });
    });

    describe('Different profiles', () => {
      it('should generate valid styles for all profiles', () => {
        const profiles = [
          dyslexiaProfile,
          dyscalculiaProfile,
          dysgraphiaProfile,
          adhdProfile,
          dyspraxiaProfile,
          stutteringProfile,
        ];

        profiles.forEach((profile) => {
          const styles = generateStyles(profile);
          expect(styles).toHaveProperty('page');
          expect(styles).toHaveProperty('header');
          expect(styles).toHaveProperty('content');
          expect(styles).toHaveProperty('footer');
          expect(styles.page.size).toBe('A4');
          expect(styles.page.backgroundColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        });
      });
    });
  });

  describe('getColorScheme', () => {
    it('should return color scheme with required properties', () => {
      const scheme = getColorScheme(dyslexiaProfile);
      expect(scheme).toHaveProperty('primary');
      expect(scheme).toHaveProperty('background');
      expect(scheme).toHaveProperty('accent');
      expect(scheme).toHaveProperty('muted');
      expect(scheme).toHaveProperty('border');
      expect(scheme).toHaveProperty('highlight');
    });

    it('should use profile colors for primary and background', () => {
      const scheme = getColorScheme(dyslexiaProfile);
      expect(scheme.primary).toBe('#1e293b');
      expect(scheme.background).toBe('#fffbeb');
    });

    it('should use consistent muted and border colors', () => {
      const scheme = getColorScheme(dyslexiaProfile);
      expect(scheme.muted).toBe('#64748b');
      expect(scheme.border).toBe('#e2e8f0');
    });

    describe('Profile-specific accent colors', () => {
      it('should use blue accent for dyslexia', () => {
        const scheme = getColorScheme(dyslexiaProfile);
        expect(scheme.accent).toBe('#3b82f6');
      });

      it('should use green accent for dyscalculia', () => {
        const scheme = getColorScheme(dyscalculiaProfile);
        expect(scheme.accent).toBe('#059669');
      });

      it('should use purple accent for adhd', () => {
        const scheme = getColorScheme(adhdProfile);
        expect(scheme.accent).toBe('#7c3aed');
      });

      it('should use amber accent for dyspraxia', () => {
        const scheme = getColorScheme(dyspraxiaProfile);
        expect(scheme.accent).toBe('#f59e0b');
      });

      it('should use default blue accent for other profiles', () => {
        const scheme = getColorScheme(stutteringProfile);
        expect(scheme.accent).toBe('#3b82f6');
      });
    });

    describe('Profile-specific highlight colors', () => {
      it('should use light yellow highlight for dyslexia', () => {
        const scheme = getColorScheme(dyslexiaProfile);
        expect(scheme.highlight).toBe('#fef3c7');
      });

      it('should use light green highlight for dyscalculia', () => {
        const scheme = getColorScheme(dyscalculiaProfile);
        expect(scheme.highlight).toBe('#d1fae5');
      });

      it('should use light blue highlight for adhd', () => {
        const scheme = getColorScheme(adhdProfile);
        expect(scheme.highlight).toBe('#dbeafe');
      });

      it('should use light amber highlight for dyspraxia', () => {
        const scheme = getColorScheme(dyspraxiaProfile);
        expect(scheme.highlight).toBe('#fef9c3');
      });

      it('should use default light gray highlight for other profiles', () => {
        const scheme = getColorScheme(stutteringProfile);
        expect(scheme.highlight).toBe('#f1f5f9');
      });
    });

    describe('All colors should be valid hex', () => {
      it('should return valid hex colors for all properties', () => {
        const profiles = [
          dyslexiaProfile,
          dyscalculiaProfile,
          adhdProfile,
          dyspraxiaProfile,
          stutteringProfile,
        ];

        profiles.forEach((profile) => {
          const scheme = getColorScheme(profile);
          Object.values(scheme).forEach((color) => {
            expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
          });
        });
      });
    });
  });
});
