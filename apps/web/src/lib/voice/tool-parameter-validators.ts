// ============================================================================
// TOOL PARAMETER VALIDATORS
// Validation logic for tool parameters
// ============================================================================

import {
  TOOL_SCHEMAS,
  type ValidationResult,
  type ToolParameterSchema,
} from "./tool-parameter-schemas";

/**
 * Validate parameters against tool schema
 *
 * @param toolName - The tool name
 * @param params - Parameters to validate
 * @returns Validation result with errors (if any)
 *
 * @example
 * const result = validateParameters('quiz', {
 *   topic: 'fotosintesi',
 *   questionCount: 5
 * });
 * console.log(result); // { valid: true, errors: [] }
 */
export function validateParameters(
  toolName: string,
  params: Record<string, unknown>,
): ValidationResult {
  const errors: string[] = [];

  // Check if tool exists
  const schema = TOOL_SCHEMAS[toolName];
  if (!schema) {
    return {
      valid: false,
      errors: [`Unknown tool: ${toolName}`],
    };
  }

  // Validate each parameter definition
  for (const paramDef of schema.parameters) {
    const value = params[paramDef.name];

    // Check required parameters
    if (paramDef.required && value === undefined) {
      errors.push(`Missing required parameter: ${paramDef.name}`);
      continue;
    }

    // Skip validation if not provided and not required
    if (value === undefined && !paramDef.required) {
      continue;
    }

    // Type validation
    if (value !== undefined) {
      switch (paramDef.type) {
        case "string":
          if (typeof value !== "string") {
            errors.push(
              `Parameter "${paramDef.name}" must be a string, got ${typeof value}`,
            );
          }
          break;

        case "number":
          if (typeof value !== "number") {
            errors.push(
              `Parameter "${paramDef.name}" must be a number, got ${typeof value}`,
            );
          }
          break;

        case "boolean":
          if (typeof value !== "boolean") {
            errors.push(
              `Parameter "${paramDef.name}" must be a boolean, got ${typeof value}`,
            );
          }
          break;

        case "enum":
          if (!paramDef.enumValues?.includes(String(value))) {
            errors.push(
              `Parameter "${paramDef.name}" must be one of [${paramDef.enumValues?.join(", ")}], got "${value}"`,
            );
          }
          break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get schema for a specific tool
 */
export function getToolSchema(
  toolName: string,
): ToolParameterSchema | undefined {
  return TOOL_SCHEMAS[toolName];
}

/**
 * Get all parameter names for a tool
 */
export function getToolParameterNames(toolName: string): string[] {
  const schema = TOOL_SCHEMAS[toolName];
  return schema ? schema.parameters.map((p) => p.name) : [];
}

/**
 * Get required parameter names for a tool
 */
export function getRequiredParameters(toolName: string): string[] {
  const schema = TOOL_SCHEMAS[toolName];
  return schema
    ? schema.parameters.filter((p) => p.required).map((p) => p.name)
    : [];
}

/**
 * Get all supported tools
 */
export function getAllTools(): string[] {
  return Object.keys(TOOL_SCHEMAS);
}
