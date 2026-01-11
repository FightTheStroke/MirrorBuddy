/**
 * Types for accessibility showcase page
 */

export interface ActiveSettings {
  dyslexiaFont: boolean;
  extraLetterSpacing: boolean;
  increasedLineHeight: boolean;
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  ttsEnabled: boolean;
  distractionFreeMode: boolean;
  lineSpacing: number;
  fontSize: number;
  [key: string]: boolean | number;
}
