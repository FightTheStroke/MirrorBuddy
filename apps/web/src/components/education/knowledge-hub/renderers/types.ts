/**
 * Knowledge Hub Renderer Types
 *
 * Shared types for all renderer components.
 * Extracted to avoid circular dependencies with index.tsx.
 */

import type { ComponentType } from "react";

/**
 * Base props that all renderers should accept
 */
export interface BaseRendererProps {
  /** The material content data */
  data: Record<string, unknown>;
  /** Additional CSS classes */
  className?: string;
  /** Whether the renderer is in read-only mode */
  readOnly?: boolean;
}

/**
 * Renderer component type
 */
export type RendererComponent = ComponentType<BaseRendererProps>;
