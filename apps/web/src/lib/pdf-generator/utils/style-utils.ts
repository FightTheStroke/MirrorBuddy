/**
 * PDF Style Utilities
 * Centralized style handling for @react-pdf/renderer components
 *
 * Note: @react-pdf/renderer accepts style arrays at runtime but its
 * TypeScript types don't properly support this. This module provides
 * type-safe helpers to work around this limitation.
 */

import type { Style } from '@react-pdf/types';

/**
 * Style input type - accepts single style object or array of styles
 * This is what react-pdf actually accepts at runtime
 */
export type StyleInput = Style | Style[] | object | object[];

/**
 * Sanitize a numeric value for PDF styling
 * Prevents "unsupported number" errors from extreme values
 */
export function sanitizeNumber(value: unknown, defaultValue = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultValue;
  }
  // Clamp to reasonable PDF bounds (-10000 to 10000)
  return Math.max(-10000, Math.min(10000, value));
}

/**
 * Sanitize all numeric values in a style object
 */
export function sanitizeStyles<T extends Record<string, unknown>>(styles: T): T {
  const result = { ...styles } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === 'number') {
      result[key] = sanitizeNumber(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeStyles(value as Record<string, unknown>);
    }
  }
  return result as T;
}

/**
 * Merge styles into a format acceptable by react-pdf components
 * Centralizes the type assertion to avoid scattered `as any` casts
 *
 * @param baseStyle - The base style from StyleSheet.create()
 * @param additionalStyle - Optional additional style to merge
 * @returns Style compatible with react-pdf components
 *
 * @example
 * // Single style
 * <Text style={mergeStyles(styles.text)} />
 *
 * // With additional style
 * <Text style={mergeStyles(styles.text, customStyle)} />
 */
export function mergeStyles(
  baseStyle: StyleInput,
  additionalStyle?: StyleInput
): Style {
  if (!additionalStyle) {
    // Sanitize numeric values to prevent PDF rendering errors
    if (baseStyle && typeof baseStyle === 'object' && !Array.isArray(baseStyle)) {
      return sanitizeStyles(baseStyle as Record<string, unknown>) as unknown as Style;
    }
    return baseStyle as unknown as Style;
  }
  const merged = [baseStyle, additionalStyle].flat();
  // Sanitize each style object in the array
  const sanitized = merged.map((s) => {
    if (s && typeof s === 'object' && !Array.isArray(s)) {
      return sanitizeStyles(s as Record<string, unknown>);
    }
    return s;
  });
  return sanitized as unknown as Style;
}

/**
 * Convert style array to react-pdf compatible format
 * Use when you already have an array of styles
 *
 * @param styles - Array of style objects
 * @returns Style compatible with react-pdf components
 */
export function toReactPdfStyle(styles: StyleInput): Style {
  if (Array.isArray(styles)) {
    return styles.map((s) => {
      if (s && typeof s === 'object') {
        return sanitizeStyles(s as Record<string, unknown>);
      }
      return s;
    }) as unknown as Style;
  }
  if (styles && typeof styles === 'object') {
    return sanitizeStyles(styles as Record<string, unknown>) as unknown as Style;
  }
  return styles as unknown as Style;
}
