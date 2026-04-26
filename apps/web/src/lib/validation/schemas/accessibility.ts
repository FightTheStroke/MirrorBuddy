/**
 * Zod schemas for accessibility settings validation
 */

import { z } from "zod";

/**
 * Schema for accessibility settings update
 * All fields optional for partial updates
 */
export const AccessibilitySettingsSchema = z.object({
  // Dyslexia support
  dyslexiaFont: z.boolean().optional(),
  extraLetterSpacing: z.boolean().optional(),
  increasedLineHeight: z.boolean().optional(),

  // Visual support
  highContrast: z.boolean().optional(),
  largeText: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),

  // Text-to-Speech
  ttsEnabled: z.boolean().optional(),
  ttsSpeed: z.number().min(0.5).max(2.0).optional(),
  ttsAutoRead: z.boolean().optional(),

  // ADHD support
  adhdMode: z.boolean().optional(),
  distractionFreeMode: z.boolean().optional(),
  breakReminders: z.boolean().optional(),

  // General accessibility
  lineSpacing: z.number().min(1.0).max(2.0).optional(),
  fontSize: z.number().min(0.8).max(1.5).optional(),
  colorBlindMode: z.boolean().optional(),
  keyboardNavigation: z.boolean().optional(),

  // Custom colors
  customBackgroundColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  customTextColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),

  // ADHD config/stats (JSON strings)
  adhdConfig: z.string().optional(),
  adhdStats: z.string().optional(),
});

export type AccessibilitySettingsInput = z.infer<
  typeof AccessibilitySettingsSchema
>;
