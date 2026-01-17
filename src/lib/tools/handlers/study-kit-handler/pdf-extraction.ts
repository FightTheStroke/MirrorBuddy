// ============================================================================
// STUDY KIT - PDF EXTRACTION
// Extract text from PDF buffer using pdf-parse v2 API
// ============================================================================

import { PDFParse } from 'pdf-parse';
import { logger } from '@/lib/logger';

/**
 * Extract text from PDF buffer using pdf-parse v2 API
 * C-18 FIX: Improved error handling and logging
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  let parser: PDFParse | null = null;
  try {
    // Validate input
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty or invalid PDF buffer');
    }

    logger.debug('Starting PDF extraction', { bufferSize: buffer.length });

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
    const textResult = await parser.getText();
    logger.debug('Text extraction complete', { textLength: textResult.text.length });

    // Get document info for page count
    const infoResult = await parser.getInfo();
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
      error: errorMessage,
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
        logger.warn('Error destroying PDF parser', { error: String(destroyError) });
      }
    }
  }
}
