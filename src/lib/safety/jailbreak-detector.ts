/**
 * MirrorBuddy Jailbreak Detector
 * Advanced detection of prompt injection and jailbreak attempts
 *
 * This module provides sophisticated detection beyond simple pattern matching:
 * - Multi-turn attack detection (building up across messages)
 * - Encoding/obfuscation detection (base64, rot13, leetspeak)
 * - Context-aware threat scoring
 * - Conversation history analysis
 *
 * Related: #30 Safety Guardrails Issue, S-04 Task
 */

export * from './jailbreak-detector/index';
