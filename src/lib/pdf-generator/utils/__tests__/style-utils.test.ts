// ============================================================================
// STYLE UTILS TESTS
// Unit tests for PDF style utilities
// ============================================================================

import { describe, it, expect } from 'vitest';
import { mergeStyles, toReactPdfStyle, type StyleInput } from '../style-utils';

describe('Style Utils', () => {
  describe('mergeStyles', () => {
    it('should return base style when no additional style', () => {
      const baseStyle = { fontSize: 12, color: 'black' };
      const result = mergeStyles(baseStyle);

      expect(result).toBe(baseStyle);
    });

    it('should merge two style objects into array', () => {
      const baseStyle = { fontSize: 12 };
      const additionalStyle = { color: 'red' };
      const result = mergeStyles(baseStyle, additionalStyle) as unknown as unknown[];

      expect(result).toEqual([baseStyle, additionalStyle]);
    });

    it('should handle array base style', () => {
      const baseStyle = [{ fontSize: 12 }, { color: 'blue' }];
      const additionalStyle = { fontWeight: 'bold' };
      const result = mergeStyles(baseStyle, additionalStyle) as unknown as unknown[];

      // Arrays should be flattened
      expect(result).toHaveLength(3);
    });

    it('should handle array additional style', () => {
      const baseStyle = { fontSize: 12 };
      const additionalStyle = [{ color: 'red' }, { fontWeight: 'bold' }];
      const result = mergeStyles(baseStyle, additionalStyle) as unknown as unknown[];

      expect(result).toHaveLength(3);
    });

    it('should handle both arrays', () => {
      const baseStyle = [{ fontSize: 12 }, { padding: 10 }];
      const additionalStyle = [{ color: 'red' }, { margin: 5 }];
      const result = mergeStyles(baseStyle, additionalStyle) as unknown as unknown[];

      expect(result).toHaveLength(4);
    });

    it('should handle empty object styles', () => {
      const baseStyle = {};
      const additionalStyle = {};
      const result = mergeStyles(baseStyle, additionalStyle);

      expect(result).toBeDefined();
    });

    it('should handle undefined additional style', () => {
      const baseStyle = { fontSize: 14 };
      const result = mergeStyles(baseStyle, undefined);

      expect(result).toBe(baseStyle);
    });
  });

  describe('toReactPdfStyle', () => {
    it('should convert single style object', () => {
      const style = { fontSize: 12, color: 'black' };
      const result = toReactPdfStyle(style);

      expect(result).toBe(style);
    });

    it('should convert array of styles', () => {
      const styles = [{ fontSize: 12 }, { color: 'red' }];
      const result = toReactPdfStyle(styles);

      expect(result).toBe(styles);
    });

    it('should handle empty object', () => {
      const style = {};
      const result = toReactPdfStyle(style);

      expect(result).toBe(style);
    });

    it('should handle empty array', () => {
      const styles: StyleInput = [];
      const result = toReactPdfStyle(styles);

      expect(result).toEqual([]);
    });

    it('should pass through complex nested styles', () => {
      const style = {
        fontSize: 12,
        padding: 10,
        marginTop: 5,
        backgroundColor: '#ffffff',
      };
      const result = toReactPdfStyle(style);

      expect(result).toEqual(style);
    });
  });

  describe('StyleInput type', () => {
    it('should accept Style objects', () => {
      const style: StyleInput = { fontSize: 12 };
      expect(mergeStyles(style)).toBeDefined();
    });

    it('should accept Style arrays', () => {
      const styles: StyleInput = [{ fontSize: 12 }, { color: 'red' }];
      expect(mergeStyles(styles)).toBeDefined();
    });

    it('should accept plain objects', () => {
      const style: StyleInput = { customProp: 'value' } as StyleInput;
      expect(toReactPdfStyle(style)).toBeDefined();
    });
  });
});
