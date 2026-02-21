/**
 * Study Kit Extraction
 * PDF text extraction functionality
 * Issue: Wave 2 - Auto-generate study kit from PDF upload
 *
 * VERCEL FIX: pdf-parse is imported dynamically to avoid breaking
 * the entire chat API when the module fails to load on Vercel.
 * See ADR 0053: Vercel Runtime Constraints
 */

import { logger } from '@/lib/logger';

// Type for the PDFParse class (dynamic import)
type PDFParseInstance = {
  getText(): Promise<{ text: string }>;
  getInfo(): Promise<{ total: number }>;
  destroy(): Promise<void>;
};

/**
 * Extract text from PDF buffer using pdf-parse v2 API
 * C-18 FIX: Improved error handling and logging
 * VERCEL FIX: Dynamic import to prevent module load failures
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
}> {
  let parser: PDFParseInstance | null = null;

  const withTimeout = async <T>(
    operationPromise: Promise<T>,
    operationName: string,
  ): Promise<T> => {
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        operationPromise,
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`${operationName} timed out after 30 seconds`));
          }, 30_000);
        }),
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  try {
    // Validate input
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty or invalid PDF buffer');
    }

    logger.debug('Starting PDF extraction', { bufferSize: buffer.length });

    // Dynamic import to avoid breaking chat API when pdf-parse has issues
    const { PDFParse } = await import('pdf-parse').catch((importError) => {
      const importErrorMessage =
        importError instanceof Error ? importError.message : String(importError);
      throw new Error(`Failed to load pdf-parse module: ${importErrorMessage}`);
    });

    // Convert Buffer to Uint8Array for pdf-parse v2
    const data = new Uint8Array(buffer);

    // Create parser with Node.js-optimized settings
    parser = new PDFParse({
      data,
      // Disable features not needed for text extraction
      disableFontFace: true,
      isOffscreenCanvasSupported: false,
    });

    // Extract text first
    const textResult = await withTimeout(parser.getText(), 'PDF text extraction');
    logger.debug('Text extraction complete', {
      textLength: textResult.text.length,
    });

    // Get document info for page count
    const infoResult = await withTimeout(parser.getInfo(), 'PDF info extraction');
    logger.debug('Info extraction complete', { pageCount: infoResult.total });

    return {
      text: textResult.text,
      pageCount: infoResult.total,
    };
  } catch (error) {
    // C-18 FIX: Preserve actual error message for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('Failed to extract text from PDF', {
      errorDetails: errorMessage,
      stack: errorStack,
      bufferSize: buffer?.length,
    });

    // Re-throw with actual error message for better debugging
    throw new Error(`Failed to parse PDF: ${errorMessage}`);
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch (destroyError) {
        logger.warn('Error destroying PDF parser', {
          error: String(destroyError),
        });
      }
    }
  }
}
