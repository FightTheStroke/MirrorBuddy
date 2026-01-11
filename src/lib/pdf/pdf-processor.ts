/**
 * MirrorBuddy PDF Processor
 * Client-side PDF to image conversion using pdf.js
 *
 * Converts PDF pages to images for Vision API analysis.
 * Uses Mozilla's pdf.js library for rendering.
 *
 * Related: Issue #21, ADR-0001
 */

import * as pdfjsLib from 'pdfjs-dist';
import { logger } from '@/lib/logger';
import {
  ProcessedPage,
  ProcessedPDF,
  PDFProcessingError,
  PDFProcessOptions,
} from './pdf-types';
import { isPDF, getPDFInfo, resizeImageToThumbnail } from './pdf-utils';

export { isPDF, getPDFInfo };
export type { ProcessedPage, ProcessedPDF, PDFProcessOptions };
export { PDFProcessingError };

// Configure pdf.js worker
// The worker is loaded from CDN for optimal bundle size
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

/**
 * Maximum number of pages to process
 * Prevents overwhelming the Vision API with too many requests
 */
export const MAX_PDF_PAGES = 5;

/**
 * Default rendering scale for high-quality output
 * 2.0 gives good quality without excessive file size
 */
export const DEFAULT_SCALE = 2.0;

/**
 * Process a PDF file and convert pages to images
 *
 * @param file - The PDF file to process
 * @param options - Processing options
 * @returns Processed PDF with page images
 */
export async function processPDF(
  file: File,
  options: PDFProcessOptions = {}
): Promise<ProcessedPDF> {
  const {
    scale = DEFAULT_SCALE,
    maxPages = MAX_PDF_PAGES,
    pageNumbers,
    format = 'image/jpeg',
    quality = 0.9,
  } = options;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const totalPages = pdf.numPages;
    const pagesToProcess = pageNumbers
      ? pageNumbers.filter((n) => n >= 1 && n <= totalPages)
      : Array.from({ length: Math.min(totalPages, maxPages) }, (_, i) => i + 1);

    const pages: ProcessedPage[] = [];

    for (const pageNum of pagesToProcess) {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        // Create canvas for rendering
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Failed to get canvas context');
        }

        // Render page to canvas (canvas property required for pdfjs-dist v5)
        await page.render({
          canvasContext: context,
          viewport,
          canvas,
        } as Parameters<typeof page.render>[0]).promise;

        // Convert to image
        const imageData = canvas.toDataURL(format, quality);

        pages.push({
          pageNumber: pageNum,
          imageData,
          width: viewport.width,
          height: viewport.height,
        });
      } catch (renderError) {
        logger.error(`Failed to render page ${pageNum}`, { error: renderError });
        // Continue with other pages
      }
    }

    if (pages.length === 0) {
      throw new PDFProcessingError(
        'Impossibile elaborare nessuna pagina del PDF.',
        'RENDER_FAILED'
      );
    }

    return {
      totalPages,
      processedPages: pages.length,
      pages,
      truncated: totalPages > maxPages && !pageNumbers,
      filename: file.name,
    };
  } catch (error) {
    if (error instanceof PDFProcessingError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.message.includes('password')) {
        throw new PDFProcessingError(
          'Il PDF è protetto da password. Rimuovi la protezione e riprova.',
          'ENCRYPTED',
          error
        );
      }
      if (error.message.includes('Invalid PDF')) {
        throw new PDFProcessingError(
          'Il file non è un PDF valido.',
          'INVALID',
          error
        );
      }
    }

    throw new PDFProcessingError(
      'Errore durante l\'elaborazione del PDF. Riprova.',
      'LOAD_FAILED',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Generate a thumbnail for the first page of a PDF
 *
 * @param file - The PDF file
 * @param thumbnailWidth - Desired thumbnail width (default: 200)
 * @returns Base64 data URL of the thumbnail
 */
export async function generatePDFThumbnail(
  file: File,
  thumbnailWidth = 200
): Promise<string> {
  const result = await processPDF(file, {
    maxPages: 1,
    scale: 1.0,
    quality: 0.8,
  });

  if (result.pages.length === 0) {
    throw new PDFProcessingError(
      'Impossibile generare la miniatura del PDF.',
      'RENDER_FAILED'
    );
  }

  const page = result.pages[0];
  return resizeImageToThumbnail(page.imageData, page.width, thumbnailWidth);
}
