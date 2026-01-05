/**
 * PDF Generator Types
 * Type definitions for accessible PDF generation for DSA students
 */

// DSA Profile Types
export type DSAProfile =
  | 'dyslexia'
  | 'dyscalculia'
  | 'dysgraphia'
  | 'dysorthography'
  | 'adhd'
  | 'dyspraxia'
  | 'stuttering';

// Profile configuration interface
export interface ProfileConfig {
  name: string;
  nameIt: string;
  description: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  backgroundColor: string;
  textColor: string;
  paragraphSpacing: number;
  headingScale: number;
  // Profile-specific options
  options: ProfileOptions;
}

export interface ProfileOptions {
  // Dyslexia
  dyslexiaFont?: boolean;
  warmBackground?: boolean;
  extraSpacing?: boolean;

  // Dyscalculia
  largeNumbers?: boolean;
  coloredOperators?: boolean;
  gridLines?: boolean;
  stepByStep?: boolean;

  // Dysgraphia
  borderBoxes?: boolean;
  structuredLayout?: boolean;
  mediumWeight?: boolean;

  // Dysorthography
  underlinePatterns?: boolean;
  syllableHighlight?: boolean;
  spellingHints?: boolean;
  colorCodingRoots?: boolean;

  // ADHD
  distractionFree?: boolean;
  clearSections?: boolean;
  bulletPoints?: boolean;
  shortParagraphs?: boolean;
  progressIndicators?: boolean;
  highlightKeyTerms?: boolean;

  // Dyspraxia
  syllableUnderlines?: boolean;
  readingTimeEstimate?: boolean;
  pauseMarkers?: boolean;
  chunkedText?: boolean;

  // Stuttering
  simplePunctuation?: boolean;
  shortSentences?: boolean;
  breathingMarks?: boolean;
  rhythmicLayout?: boolean;
}

// Content types
export interface ExtractedContent {
  title: string;
  subject?: string;
  sections: ContentSection[];
  images: ContentImage[];
  metadata: ContentMetadata;
}

export interface ContentSection {
  type: 'heading' | 'paragraph' | 'list' | 'image' | 'formula' | 'quote';
  content: string;
  level?: number; // For headings (1, 2, 3)
  items?: string[]; // For lists
  metadata?: Record<string, unknown>;
}

export interface ContentImage {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface ContentMetadata {
  wordCount: number;
  readingTime: number;
  generatedAt: string;
  sourceKitId: string;
  sourceMaterialId?: string;
}

// PDF Generation request/response
export interface PDFGeneratorRequest {
  kitId: string;
  materialId?: string;
  profile: DSAProfile;
  format?: 'A4' | 'Letter';
  studentId?: string;
}

export interface PDFGeneratorResponse {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  size?: number;
  savedToZaino?: boolean;
  error?: string;
}

// Operator colors for dyscalculia
export interface OperatorColors {
  plus: string;
  minus: string;
  multiply: string;
  divide: string;
  equals: string;
}

// Style types for PDF components
export interface PDFStyles {
  page: PDFPageStyle;
  header: PDFHeaderStyle;
  content: PDFContentStyle;
  footer: PDFFooterStyle;
}

export interface PDFPageStyle {
  size: 'A4' | 'LETTER';
  orientation: 'portrait' | 'landscape';
  backgroundColor: string;
  padding: number;
}

export interface PDFHeaderStyle {
  fontSize: number;
  color: string;
  borderBottom: boolean;
  marginBottom: number;
}

export interface PDFContentStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  color: string;
  letterSpacing: number;
  wordSpacing: number;
}

export interface PDFFooterStyle {
  fontSize: number;
  color: string;
  showPageNumbers: boolean;
  showDate: boolean;
}
