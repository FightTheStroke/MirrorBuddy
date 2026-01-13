/**
 * Tool Plugin System Types
 * Defines scalable, maintainable types for tool categories and permissions
 * Includes plugin interface and Zod validation schemas (F-05, F-08)
 */

import React from 'react';
import { z } from 'zod';
import type { ToolResult, ToolContext } from '@/types/tools';

/**
 * ToolCategory - Categorizes tools by their primary function
 * Used for organization, filtering, and feature organization
 */
export enum ToolCategory {
  // Tools for creating educational content and artifacts
  CREATION = 'creation',

  // Tools for explaining concepts and demonstrating ideas
  EDUCATIONAL = 'educational',

  // Tools for navigating content and organizing information
  NAVIGATION = 'navigation',

  // Tools for evaluating knowledge and measuring progress
  ASSESSMENT = 'assessment',

  // Utility tools for productivity and accessibility
  UTILITY = 'utility',
}

/**
 * Permission - Defines what actions a tool can perform
 * Enables granular access control and security boundaries
 */
export enum Permission {
  // Access chat history and conversation context
  READ_CONVERSATION = 'read_conversation',

  // Access user profile, settings, and preferences
  READ_PROFILE = 'read_profile',

  // Create, modify, or delete user content
  WRITE_CONTENT = 'write_content',

  // Use text-to-speech and audio output
  VOICE_OUTPUT = 'voice_output',

  // Read and write files (exports, imports, etc.)
  FILE_ACCESS = 'file_access',
}

/**
 * ToolCategoryValues - Type helper for ToolCategory values
 */
export type ToolCategoryValue = `${ToolCategory}`;

/**
 * PermissionValue - Type helper for Permission values
 */
export type PermissionValue = `${Permission}`;

/**
 * ToolPermissionSet - Defines permissions required for a tool
 */
export interface ToolPermissionSet {
  permissions: Permission[];
  optional?: Permission[];
}

/**
 * VoicePromptConfig - Configuration for dynamic voice prompts
 * Supports template-based prompts with context variable substitution
 * Used for complex voice scenarios requiring dynamic content (F-01, F-13)
 */
export interface VoicePromptConfig {
  // Template string with variable placeholders (e.g., "Vuoi creare {toolName} su {topic}?")
  template: string;

  // Required context variables for template substitution (e.g., ['topic', 'subject'])
  requiresContext?: string[];

  // Fallback prompt if context variables are unavailable
  fallback?: string;
}

/**
 * ToolMetadata - Describes a tool's capabilities and requirements
 */
export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  permissions: ToolPermissionSet;
  version: string;
  enabled: boolean;
}

/**
 * ToolPlugin - Complete plugin definition with all metadata and handlers
 * Enables scalable tool registration and execution (F-05, F-08)
 * Supports voice interaction with both simple strings and complex configurations (F-01, F-13)
 */
export interface ToolPlugin {
  // Identifier and naming
  id: string;
  name: string;

  // Organization and metadata
  category: ToolCategory;

  // Input validation schema (Zod)
  schema: z.ZodSchema<Record<string, unknown>>;

  // Handler function for execution
  handler: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;

  // Voice interaction support - supports both simple string prompts and complex configurations
  voicePrompt: string | VoicePromptConfig;
  voiceFeedback: string | VoicePromptConfig;
  voiceEnabled?: boolean; // Default true - controls whether voice features are active for this tool
  triggers: string[];

  // Execution requirements
  prerequisites: string[];
  permissions: Permission[];

  // Optional custom UI component
  uiComponent?: React.ComponentType<{ data: unknown; onClose: () => void }>;
}

/**
 * Zod schema for VoicePromptConfig validation
 * Validates template-based voice prompt configurations
 */
export const VoicePromptConfigSchema = z.object({
  template: z.string().min(1, 'Template is required').max(500, 'Template must be under 500 characters'),
  requiresContext: z.array(z.string()).optional(),
  fallback: z.string().max(500, 'Fallback must be under 500 characters').optional(),
});

/**
 * Zod schema for ToolPlugin validation
 * Ensures all plugins conform to interface requirements
 * Validates plugin registration and configuration (F-05, F-08, F-01, F-13)
 */
export const ToolPluginSchema = z.object({
  id: z.string().min(1, 'Tool ID is required').regex(/^[a-z_]+$/, 'Tool ID must be lowercase alphanumeric'),
  name: z.string().min(1, 'Tool name is required').max(100, 'Tool name must be under 100 characters'),
  category: z.nativeEnum(ToolCategory),
  schema: z.any(), // Zod schema instance (cannot be validated at runtime)
  handler: z.any(), // Function type (runtime validation at execution time)
  voicePrompt: z.union([
    z.string().min(1, 'Voice prompt is required').max(500, 'Voice prompt must be under 500 characters'),
    VoicePromptConfigSchema,
  ]),
  voiceFeedback: z.union([
    z.string().min(1, 'Voice feedback is required').max(500, 'Voice feedback must be under 500 characters'),
    VoicePromptConfigSchema,
  ]),
  voiceEnabled: z.boolean().optional().default(true),
  triggers: z.array(z.string()).min(1, 'At least one trigger is required'),
  prerequisites: z.array(z.string()).default([]),
  permissions: z.array(z.nativeEnum(Permission)).min(0),
  uiComponent: z.any().optional(), // React component (runtime validation)
});

/**
 * Zod schema for tool execution arguments
 * Used to validate user input before handler execution
 */
export const ToolExecutionArgsSchema = z.record(z.string(), z.unknown());

/**
 * ToolErrorCode - Enumeration of standardized error codes for tool execution
 * Enables consistent error handling and recovery strategies (F-06, F-07)
 */
export enum ToolErrorCode {
  // Plugin management errors
  PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',

  // Prerequisite errors
  PREREQUISITES_NOT_MET = 'PREREQUISITES_NOT_MET',

  // Permission errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // Execution errors
  EXECUTION_FAILED = 'EXECUTION_FAILED',

  // Timeout errors
  TIMEOUT = 'TIMEOUT',

  // Unknown errors
  UNKNOWN = 'UNKNOWN',
}

/**
 * ToolError - Structured error information for tool execution failures
 * Provides detailed error context for debugging and user feedback (F-06, F-07)
 */
export interface ToolError {
  code: ToolErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * createSuccessResult - Helper to create a successful ToolResult
 * Constructs result with success=true and metadata
 */
export function createSuccessResult(
  toolId: string,
  data?: unknown,
): ToolResult {
  return {
    success: true,
    data,
    renderComponent: undefined,
  };
}

/**
 * createErrorResult - Helper to create a failed ToolResult with error details
 * Constructs result with success=false and standardized error information
 */
export function createErrorResult(
  toolId: string,
  code: ToolErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ToolResult {
  const error: ToolError = {
    code,
    message,
    details,
  };

  return {
    success: false,
    error: message,
    data: { error },
    renderComponent: undefined,
  };
}
