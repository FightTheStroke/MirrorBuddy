/**
 * Tool Plugin System - Main exports
 *
 * Core Components:
 * - ToolRegistry: Singleton for plugin registration and discovery
 * - ToolOrchestrator: Execution engine with validation and error handling
 * - VoiceFeedbackInjector: Dynamic voice prompts with template substitution
 * - TriggerDetector: Voice transcript analysis for tool matching
 * - DataChannel: WebRTC-based tool event broadcasting
 *
 * Security: Implements DoS protection, XSS sanitization, and timeout limits
 */

// Core types and interfaces
export * from './types';

// Constants for security limits and localized messages
export * from './constants';

// Plugin registry (singleton)
export * from './registry';

// Orchestrator for tool execution
export * from './orchestrator';

// Initialization utilities
export * from './init';

// Voice integration
export * from './trigger-detector';
export * from './voice-feedback';
export * from './feedback-handler';
export * from './voice-flow';

// Maestro proposal system
export * from './proposal-injector';

// WebRTC DataChannel integration
export * from './data-channel-protocol';
export * from './data-channel-sender';
export * from './data-channel-receiver';
export * from './event-broadcaster';
