/**
 * PDF Generator Utilities
 * Barrel export for utility functions
 */

export { extractStudyKitContent } from './content-extractor-core';

export { estimateReadingTime } from './content-extractor-parsers';

export {
  generateStyles,
  createProfileStyleSheet,
  getColorScheme,
} from './style-generator';

export {
  mergeStyles,
  toReactPdfStyle,
  type StyleInput,
} from './style-utils';
