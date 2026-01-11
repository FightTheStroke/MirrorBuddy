/**
 * @file gradient-utils.ts
 * @brief Utilities for consistent gradient styling across character components
 */

import type { CSSProperties } from 'react';

/**
 * Mapping of Tailwind gradient classes to hex colors
 * Used to normalize coach/buddy colors to hex format
 */
const TAILWIND_TO_HEX: Record<string, string> = {
  'from-purple-500 to-indigo-600': '#8B5CF6',
  'from-pink-500 to-rose-600': '#EC4899',
  'from-blue-500 to-cyan-600': '#3B82F6',
  'from-green-500 to-emerald-600': '#10B981',
  'from-orange-500 to-amber-600': '#F97316',
  'from-red-500 to-rose-600': '#EF4444',
};

/**
 * Convert any color format to hex
 */
export function normalizeToHex(color: string): string {
  if (color.startsWith('#')) return color;
  return TAILWIND_TO_HEX[color] || '#6366F1';
}

/**
 * Create horizontal gradient style for headers
 * Fades from solid color to slightly transparent version
 */
export function createGradientStyle(color: string): CSSProperties {
  const hex = normalizeToHex(color);
  return { background: `linear-gradient(to right, ${hex}, ${hex}dd)` };
}

/**
 * Create vertical gradient style for voice panels
 */
export function createVerticalGradientStyle(color: string): CSSProperties {
  const hex = normalizeToHex(color);
  return { background: `linear-gradient(180deg, ${hex}, ${hex}dd)` };
}
