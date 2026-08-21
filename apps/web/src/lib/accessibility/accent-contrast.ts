type Rgb = { r: number; g: number; b: number };

const NAMED_ACCENTS = new Set(['blue', 'green', 'purple', 'orange', 'pink']);
const MIN_NORMAL_TEXT_CONTRAST = 4.5;
const LIGHT_BACKGROUND: Rgb = { r: 255, g: 255, b: 255 };
const DARK_BACKGROUND: Rgb = { r: 15, g: 23, b: 42 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

type AccentResolution =
  | { kind: 'named' | 'invalid' }
  | { kind: 'custom'; foreground: string; background: string };

function parseHexColor(color: string): Rgb | null {
  const match = color.trim().match(/^#?([a-f\d]{3}|[a-f\d]{6})$/i);
  if (!match) return null;

  const hex = match[1].length === 3
    ? match[1].split('').map((char) => char + char).join('')
    : match[1];

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function channelLuminance(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({ r, g, b }: Rgb) {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function contrastRatio(first: Rgb, second: Rgb) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05);
}

function toHex({ r, g, b }: Rgb) {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function mixWith(color: Rgb, target: Rgb, factor: number): Rgb {
  return {
    r: Math.round(color.r * factor + target.r * (1 - factor)),
    g: Math.round(color.g * factor + target.g * (1 - factor)),
    b: Math.round(color.b * factor + target.b * (1 - factor)),
  };
}

function adjustToward(color: Rgb, target: Rgb, background: Rgb, minimumRatio: number) {
  let factor = 1;
  let adjusted = color;
  while (contrastRatio(adjusted, background) < minimumRatio && factor > 0) {
    factor -= 0.02;
    adjusted = mixWith(color, target, factor);
  }
  return adjusted;
}

export function resolveAccessibleAccentColor(accentColor: string, isDarkTheme: boolean): AccentResolution {
  if (NAMED_ACCENTS.has(accentColor)) return { kind: 'named' };

  const rgb = parseHexColor(accentColor);
  if (!rgb) return { kind: 'invalid' };

  const foreground = adjustToward(
    rgb,
    isDarkTheme ? WHITE : { r: 0, g: 0, b: 0 },
    isDarkTheme ? DARK_BACKGROUND : LIGHT_BACKGROUND,
    MIN_NORMAL_TEXT_CONTRAST,
  );
  const background = adjustToward(rgb, { r: 0, g: 0, b: 0 }, WHITE, MIN_NORMAL_TEXT_CONTRAST);

  return { kind: 'custom', foreground: toHex(foreground), background: toHex(background) };
}
