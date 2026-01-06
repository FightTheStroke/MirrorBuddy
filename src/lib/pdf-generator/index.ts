/**
 * PDF Generator for Accessible DSA Documents
 * Main entry point for the PDF generation library
 */

// Export types
export type {
  DSAProfile,
  ProfileConfig,
  ProfileOptions,
  ExtractedContent,
  ContentSection,
  ContentImage,
  ContentMetadata,
  PDFGeneratorRequest,
  PDFGeneratorResponse,
  OperatorColors,
  PDFStyles,
  PDFPageStyle,
  PDFHeaderStyle,
  PDFContentStyle,
  PDFFooterStyle,
} from './types';

// Export profiles
export {
  profiles,
  getProfile,
  getAllProfiles,
  operatorColors,
  wordPartColors,
  dyslexiaProfile,
  dyscalculiaProfile,
  dysgraphiaProfile,
  dysorthographyProfile,
  adhdProfile,
  dyspraxiaProfile,
  stutteringProfile,
} from './profiles';

// Export components
export {
  PDFDocument,
  PDFTitle,
  PDFText,
  PDFList,
  PDFImage,
} from './components';

// Export utilities
export {
  extractStudyKitContent,
  estimateReadingTime,
  generateStyles,
  createProfileStyleSheet,
  getColorScheme,
} from './utils';

// Export PDF generation function
export {
  generateAccessiblePDF,
  generatePDFFromContent,
  isValidProfile,
  getAvailableProfiles,
} from './generate';
