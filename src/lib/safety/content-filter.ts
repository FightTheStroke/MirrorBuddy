/**
 * MirrorBuddy Content Filter
 * Input validation and filtering for child safety
 *
 * This module filters user input BEFORE it reaches the AI model.
 * It detects and handles:
 * - Profanity (Italian + English)
 * - Explicit content requests
 * - Jailbreak/injection attempts
 * - Crisis/distress signals
 *
 * Related: #30 Safety Guardrails Issue, S-02 Task
 */

export * from './content-filter/index';
