import type { Page } from '@playwright/test';

function parseRgb(color: string): [number, number, number] {
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];

  const hexMatch = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (hexMatch) {
    return [parseInt(hexMatch[1], 16), parseInt(hexMatch[2], 16), parseInt(hexMatch[3], 16)];
  }

  const oklabMatch = color.match(/^oklab\(([\d.]+)%?\s+(-?[\d.]+)\s+(-?[\d.]+)/);
  if (oklabMatch) {
    const l = Number(oklabMatch[1]);
    const a = Number(oklabMatch[2]);
    const b = Number(oklabMatch[3]);
    const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
    const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
    const sPrime = l - 0.0894841775 * a - 1.291485548 * b;
    const lCube = lPrime ** 3;
    const mCube = mPrime ** 3;
    const sCube = sPrime ** 3;
    return [
      toSrgb(4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube),
      toSrgb(-1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube),
      toSrgb(-0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube),
    ];
  }

  const labMatch = color.match(/^lab\(([\d.]+)%?\s+(-?[\d.]+)\s+(-?[\d.]+)/);
  if (labMatch) {
    const l = Number(labMatch[1]);
    const a = Number(labMatch[2]);
    const b = Number(labMatch[3]);
    const fy = (l + 16) / 116;
    const fx = fy + a / 500;
    const fz = fy - b / 200;
    const xD50 = 0.96422 * toXyz(fx);
    const yD50 = toXyz(fy);
    const zD50 = 0.82521 * toXyz(fz);
    const x = 0.9555766 * xD50 - 0.0230393 * yD50 + 0.0631636 * zD50;
    const y = -0.0282895 * xD50 + 1.0099416 * yD50 + 0.0210077 * zD50;
    const z = 0.0122982 * xD50 - 0.020483 * yD50 + 1.3299098 * zD50;
    return [
      toSrgb(3.2404542 * x - 1.5371385 * y - 0.4985314 * z),
      toSrgb(-0.969266 * x + 1.8760108 * y + 0.041556 * z),
      toSrgb(0.0556434 * x - 0.2040259 * y + 1.0572252 * z),
    ];
  }

  throw new Error(`Unsupported color format: ${color}`);
}

function toXyz(value: number) {
  const cube = value ** 3;
  return cube > 0.008856 ? cube : (value - 16 / 116) / 7.787;
}

function toSrgb(value: number) {
  const channel = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, channel)) * 255);
}

function channelLuminance(channel: number) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: string, background: string) {
  const [fr, fg, fb] = parseRgb(foreground).map(channelLuminance);
  const [br, bg, bb] = parseRgb(background).map(channelLuminance);
  const foregroundLuminance = 0.2126 * fr + 0.7152 * fg + 0.0722 * fb;
  const backgroundLuminance = 0.2126 * br + 0.7152 * bg + 0.0722 * bb;
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

export async function sampledContrast(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((element) => {
    const normalizeColor = (color: string) => {
      const context = document.createElement('canvas').getContext('2d');
      if (!context) return color;
      context.fillStyle = '#000000';
      context.fillStyle = color;
      return context.fillStyle;
    };

    const style = window.getComputedStyle(element);
    const isTransparent = (color: string) =>
      color === 'transparent' || color === 'rgba(0, 0, 0, 0)' || /\/\s*0\)?$/.test(color);
    let backgroundElement: Element | null = element;
    let background = style.backgroundColor;
    while (backgroundElement && isTransparent(background)) {
      backgroundElement = backgroundElement.parentElement;
      background = backgroundElement
        ? window.getComputedStyle(backgroundElement).backgroundColor
        : 'rgb(255, 255, 255)';
    }
    return { color: normalizeColor(style.color), background: normalizeColor(background) };
  });
}
