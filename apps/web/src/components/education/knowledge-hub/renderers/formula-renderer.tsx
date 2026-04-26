"use client";

/**
 * Knowledge Hub Formula Renderer
 *
 * Wrapper around the main FormulaRenderer for use in Knowledge Hub.
 * Adapts BaseRendererProps to FormulaRendererProps.
 *
 * Expected data format:
 * {
 *   latex: string;
 *   description?: string;
 * }
 */

import { FormulaRenderer as BaseFormulaRenderer } from "@/components/tools/formula-renderer";
import type { FormulaRequest } from "@/types";
import type { BaseRendererProps } from "./types";

/**
 * Render a LaTeX formula from stored material data.
 */
export function FormulaRenderer({ data, className }: BaseRendererProps) {
  const formulaData = data as unknown as Partial<FormulaRequest>;

  // Build the request object for the base renderer
  const request: FormulaRequest = {
    latex: formulaData.latex || "",
    description: formulaData.description,
  };

  return <BaseFormulaRenderer request={request} className={className} />;
}
