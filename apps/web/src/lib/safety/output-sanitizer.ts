/**
 * MirrorBuddy Output Sanitizer
 * Post-processing filter for AI model outputs
 *
 * This module sanitizes AI OUTPUT after it's generated but before
 * it's shown to the user. It's the last line of defense against:
 * - Leaked system prompts
 * - Inappropriate content that slipped through
 * - Harmful URLs or links
 * - Excessive personal information
 *
 * Related: #30 Safety Guardrails Issue, S-03 Task
 */

export * from './output-sanitizer/index';
