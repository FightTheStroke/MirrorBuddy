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
    return baseStyle as unknown as Style;
  }
  return [baseStyle, additionalStyle].flat() as unknown as Style;
}

/**
 * Convert style array to react-pdf compatible format
 * Use when you already have an array of styles
 *
 * @param styles - Array of style objects
 * @returns Style compatible with react-pdf components
 */
export function toReactPdfStyle(styles: StyleInput): Style {
  return styles as unknown as Style;
}
