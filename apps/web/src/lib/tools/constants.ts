// ============================================================================
// TOOL CONSTANTS - Single source of truth for tool configuration
// ============================================================================

import type { ToolType } from "@/types/tools";
import {
  UPLOAD_TOOLS,
  CREATE_TOOLS,
  SEARCH_TOOLS,
  type ToolConfig,
} from "./tool-configs";

export type { ToolConfig };
export { UPLOAD_TOOLS, CREATE_TOOLS, SEARCH_TOOLS };

/**
 * Central configuration for all tools.
 * Single source of truth for routes, function names, and metadata.
 */
export const TOOL_CONFIG: Record<string, ToolConfig> = {
  ...UPLOAD_TOOLS,
  ...CREATE_TOOLS,
  ...SEARCH_TOOLS,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get tool config by function name (used by AI tool calls)
 */
export function getToolByFunctionName(
  functionName: string,
): ToolConfig | undefined {
  return Object.values(TOOL_CONFIG).find(
    (t) => t.functionName === functionName,
  );
}

/**
 * Get tool config by type
 */
export function getToolByType(type: ToolType): ToolConfig | undefined {
  return TOOL_CONFIG[type];
}

/**
 * Get route for a tool type
 */
export function getToolRoute(type: ToolType): string {
  return TOOL_CONFIG[type]?.route ?? "/";
}

/**
 * Get all tools by category
 */
export function getToolsByCategory(
  category: ToolConfig["category"],
): ToolConfig[] {
  return Object.values(TOOL_CONFIG).filter((t) => t.category === category);
}

/**
 * Check if a tool requires maestro selection
 */
export function toolRequiresMaestro(type: ToolType): boolean {
  return TOOL_CONFIG[type]?.requiresMaestro ?? true;
}

/**
 * Map function name to tool type (for tool-result-display)
 */
export function functionNameToToolType(
  functionName: string,
): ToolType | undefined {
  const tool = getToolByFunctionName(functionName);
  if (tool) return tool.type;

  // Handle legacy or alias function names
  if (functionName === "open_student_summary") {
    return "summary";
  }
  return undefined;
}

// ============================================================================
// CHARACTER TOOL NAME NORMALIZATION
// ============================================================================

/**
 * Map from character tool names (PascalCase/mixed) to ToolType.
 * Character data files use arbitrary names; this maps them to TOOL_CONFIG keys.
 * Generated from TOOL_CONFIG: each ToolType maps to itself, plus known aliases.
 */
const CHARACTER_TOOL_ALIASES: Record<string, ToolType> = (() => {
  const map: Record<string, ToolType> = {};
  // Every ToolType key maps to itself (handles lowercase coach/buddy tools)
  for (const key of Object.keys(TOOL_CONFIG)) {
    map[key] = key as ToolType;
  }
  // PascalCase aliases used in maestri data files
  map["mindmap"] = "mindmap";
  map["htmlinteractive"] = "demo";
  map["websearch"] = "search";
  map["flashcards"] = "flashcard";
  return map;
})();

/**
 * Normalize a character tool name to a ToolType.
 * Returns undefined for non-tool entries (Task, Read, Write, Audio, etc.)
 * that exist in character data but have no TOOL_CONFIG equivalent.
 */
export function normalizeCharacterToolName(name: string): ToolType | undefined {
  // Try exact match first (handles coach/buddy lowercase tools)
  if (TOOL_CONFIG[name]) return name as ToolType;
  // Try lowercase normalization (handles PascalCase maestri tools)
  return CHARACTER_TOOL_ALIASES[name.toLowerCase()];
}

/**
 * Normalize an array of character tool names to ToolType values.
 * Filters out names that don't map to any known tool.
 */
export function normalizeCharacterTools(tools: string[]): ToolType[] {
  const result: ToolType[] = [];
  for (const tool of tools) {
    const normalized = normalizeCharacterToolName(tool);
    if (normalized) result.push(normalized);
  }
  return result;
}

// ============================================================================
// CATEGORY CONFIGURATION (for Astuccio UI)
// ============================================================================

export interface ToolCategoryConfig {
  id: string;
  title: string;
  subtitle: string;
  category: ToolConfig["category"];
}

export const TOOL_CATEGORIES: ToolCategoryConfig[] = [
  {
    id: "carica",
    title: "Carica",
    subtitle: "Importa i tuoi materiali per generare supporti di studio",
    category: "upload",
  },
  {
    id: "crea",
    title: "Crea",
    subtitle: "Genera materiali di studio con l'aiuto dei Maestri",
    category: "create",
  },
  {
    id: "cerca",
    title: "Cerca",
    subtitle: "Trova risorse e approfondimenti sul web",
    category: "search",
  },
];
