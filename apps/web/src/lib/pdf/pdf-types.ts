/**
 * MirrorBuddy PDF Processor Types
 */

/**
 * Result of processing a single PDF page
 */
export interface ProcessedPage {
  pageNumber: number;
  imageData: string; // Base64 data URL
  width: number;
  height: number;
}

/**
 * Result of processing an entire PDF
 */
export interface ProcessedPDF {
  totalPages: number;
  processedPages: number;
  pages: ProcessedPage[];
  truncated: boolean; // True if totalPages > MAX_PDF_PAGES
  filename: string;
}

/**
 * PDF processing error
 */
export class PDFProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: 'LOAD_FAILED' | 'RENDER_FAILED' | 'ENCRYPTED' | 'INVALID' | 'TOO_LARGE',
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PDFProcessingError';
  }
}

/**
 * Options for PDF processing
 */
export interface PDFProcessOptions {
  /** Rendering scale (default: 2.0) */
  scale?: number;
  /** Maximum pages to process (default: MAX_PDF_PAGES) */
  maxPages?: number;
  /** Specific page numbers to process (1-indexed) */
  pageNumbers?: number[];
  /** Image format (default: 'image/jpeg') */
  format?: 'image/jpeg' | 'image/png';
  /** JPEG quality (default: 0.9) */
  quality?: number;
}
