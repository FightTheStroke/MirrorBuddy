// ============================================================================
// TOOL STATE STORE
// In-memory storage for tool states (shared between operations and helpers)
// ============================================================================

import type { ToolState } from './types';

// In-memory store for active tool states
// Key: toolId, Value: ToolState
export const activeTools = new Map<string, ToolState>();

// Session to tools mapping for quick lookup
export const sessionTools = new Map<string, Set<string>>();
