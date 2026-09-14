/**
 * Contrast contract for text placed on an arbitrary character accent colour.
 *
 * MB-360 R3: the Maestro chat user bubble painted 12px timestamps as white at
 * 60% opacity over the Maestro colour, measured in the browser at 2.95:1 on
 * `#7E57C2` (WCAG 2.1 AA requires 4.5:1 for normal text).
 *
 * The helper under test picks the readable ink for a background colour. These
 * are real ratio computations over the 27 shipped Maestro colours, not a
 * rendered-contrast proof: the rendered proof lives in the browser regression
 * `e2e/a11y-maestro-chat-mobile.spec.ts`.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { resolveReadableTextOnColor } from '../accent-contrast';

const MIN_NORMAL_TEXT_CONTRAST = 4.5;

/** Independent WCAG 2.1 ratio implementation, so the test does not reuse the helper's math. */
function ratio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const value = hex.replace('#', '');
    const channels = [0, 2, 4].map(
      (offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255,
    );
    const [r, g, b] = channels.map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/** Every accent colour shipped by the 27 Maestri (src/data/maestri). */
const MAESTRO_COLORS = [
  '#059669',
  '#06B6D4',
  '#0E7C7B',
  '#16A085',
  '#1A237E',
  '#1ABC9C',
  '#1E3A5F',
  '#27AE60',
  '#2980B9',
  '#34495E',
  '#6FA287',
  '#722F37',
  '#7E57C2',
  '#8E44AD',
  '#9B59B6',
  '#C1272D',
  '#C19A6B',
  '#C2185B',
  '#D946EF',
  '#E63946',
  '#E67E22',
  '#E74C3C',
  '#E8B64C',
  '#E91E63',
  '#EF4444',
  '#F39C12',
];

describe('resolveReadableTextOnColor', () => {
  it('reaches AA normal-text contrast on the reproduced Emmy Noether purple', () => {
    const ink = resolveReadableTextOnColor('#7E57C2');

    expect(ratio(ink, '#7E57C2')).toBeGreaterThanOrEqual(MIN_NORMAL_TEXT_CONTRAST);
  });

  it('reaches AA normal-text contrast on every shipped Maestro colour', () => {
    const failing = MAESTRO_COLORS.filter(
      (color) => ratio(resolveReadableTextOnColor(color), color) < MIN_NORMAL_TEXT_CONTRAST,
    );

    expect(failing).toEqual([]);
  });

  it('keeps white ink on dark accents and switches to black ink on light accents', () => {
    expect(resolveReadableTextOnColor('#1A237E')).toBe('#ffffff');
    expect(resolveReadableTextOnColor('#E8B64C')).toBe('#000000');
  });

  it('accepts shorthand and unprefixed hex, and falls back readably on invalid input', () => {
    expect(resolveReadableTextOnColor('#000')).toBe('#ffffff');
    expect(resolveReadableTextOnColor('7E57C2')).toBe('#ffffff');
    expect(resolveReadableTextOnColor('not-a-color')).toBe('#000000');
  });
});
