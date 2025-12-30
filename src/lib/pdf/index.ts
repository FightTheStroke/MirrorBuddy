/**
 * ConvergioEdu PDF Module
 * Client-side PDF processing for Vision API analysis
 *
 * Related: Issue #21, ADR-0001
 */

export {
  processPDF,
  getPDFInfo,
  generatePDFThumbnail,
  isPDF,
  MAX_PDF_PAGES,
  DEFAULT_SCALE,
  PDFProcessingError,
  type ProcessedPage,
  type ProcessedPDF,
  type PDFProcessOptions,
} from './pdf-processor';
