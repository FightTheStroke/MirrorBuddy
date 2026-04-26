/**
 * SVG Overview Generator - Barrel Export
 * Re-exports all public API from sub-modules for backwards compatibility
 */

// Types
export type { OverviewNode, OverviewData, SVGGenerationOptions, ThemeColors, NodePosition } from './types';

// Constants
export { THEMES, NODE_ICONS } from './constants';

// Layout functions
export { calculateRadialPositions, calculateTreePositions } from './layout';

// SVG rendering
export { generateOverviewSVG } from './svg-renderer';

// Mermaid generation
export { generateMermaidCode } from './mermaid-generator';

// Text parsing
export { parseTextToOverview } from './text-parser';

// Text utilities
export { escapeXML, truncateText, countNodes } from './text-utilities';
