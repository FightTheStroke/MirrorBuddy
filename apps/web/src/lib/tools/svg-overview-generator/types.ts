/**
 * Type definitions for SVG Overview Generator
 */

/**
 * Node in the overview structure
 */
export interface OverviewNode {
  id: string;
  label: string;
  type: 'main' | 'section' | 'concept' | 'detail';
  children?: OverviewNode[];
  color?: string;
  icon?: string;
}

/**
 * Overview data structure
 */
export interface OverviewData {
  title: string;
  subject?: string;
  root: OverviewNode;
}

/**
 * SVG generation options
 */
export interface SVGGenerationOptions {
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  layout?: 'radial' | 'tree' | 'horizontal';
  nodeSpacing?: number;
  levelSpacing?: number;
  maxLabelLength?: number;
  showIcons?: boolean;
}

/**
 * Theme colors
 */
export interface ThemeColors {
  background: string;
  mainNode: { fill: string; stroke: string; text: string };
  sectionNode: { fill: string; stroke: string; text: string };
  conceptNode: { fill: string; stroke: string; text: string };
  detailNode: { fill: string; stroke: string; text: string };
  line: string;
}

/**
 * Position record for node layout
 */
export interface NodePosition {
  node: OverviewNode;
  x: number;
  y: number;
  level: number;
}
