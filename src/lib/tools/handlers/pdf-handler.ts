// ============================================================================
// PDF HANDLER
// Extracts text from PDF files and provides it to AI context
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { extractTextFromPDF } from './study-kit-extraction';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';
import type { PDFData, ToolExecutionResult } from '@/types/tools';

/**
 * Validate PDF buffer input
 */
function validatePDFBuffer(buffer: unknown): { valid: boolean; error?: string } {
  if (!buffer) {
    return { valid: false, error: 'PDF buffer is required' };
  }

  if (!(buffer instanceof Buffer) && !(buffer instanceof Uint8Array)) {
    return { valid: false, error: 'Invalid buffer format - must be Buffer or Uint8Array' };
  }

  if (buffer.length === 0) {
    return { valid: false, error: 'PDF buffer is empty' };
  }

  // Check for PDF magic number (starts with %PDF)
  // Convert to Buffer first to ensure toString works correctly
  const bufferSlice = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
  const header = bufferSlice.slice(0, 5).toString('latin1');
  if (header !== '%PDF-') {
    return { valid: false, error: 'Invalid PDF file - missing PDF header' };
  }

  return { valid: true };
}

/**
 * Register the PDF upload handler
 * Extracts text from PDF and returns it for AI context injection
 */
registerToolHandler('upload_pdf', async (args): Promise<ToolExecutionResult> => {
  const { buffer, fileName, fileSize } = args as {
    buffer: Buffer | Uint8Array;
    fileName?: string;
    fileSize?: number;
  };

  logger.debug('PDF handler invoked', { fileName, fileSize });

  // Validate buffer
  const validation = validatePDFBuffer(buffer);
  if (!validation.valid) {
    logger.error('PDF validation failed', { error: validation.error, fileName });
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'pdf',
      error: validation.error,
    };
  }

  try {
    // Convert to Buffer if Uint8Array
    const pdfBuffer = buffer instanceof Buffer ? buffer : Buffer.from(buffer);

    // Extract text using existing extraction logic
    const { text, pageCount } = await extractTextFromPDF(pdfBuffer);

    // Validate extracted text
    if (!text || text.trim().length === 0) {
      logger.warn('PDF extraction returned empty text', { fileName, pageCount });
      return {
        success: false,
        toolId: nanoid(),
        toolType: 'pdf',
        error: 'No text could be extracted from PDF - file may be empty or contain only images',
      };
    }

    logger.info('PDF text extraction successful', {
      fileName,
      pageCount,
      textLength: text.length,
      wordCount: text.split(/\s+/).length,
    });

    const data: PDFData = {
      text: text.trim(),
      metadata: {
        pageCount,
        fileName: fileName || 'document.pdf',
        fileSize: fileSize || pdfBuffer.length,
        uploadedAt: new Date(),
      },
    };

    return {
      success: true,
      toolId: nanoid(),
      toolType: 'pdf',
      data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('PDF extraction failed', {
      error: errorMessage,
      fileName,
      fileSize,
    });

    return {
      success: false,
      toolId: nanoid(),
      toolType: 'pdf',
      error: `Failed to extract text from PDF: ${errorMessage}`,
    };
  }
});

/**
 * Utility function to format extracted PDF text for AI context
 * Provides structured context that AI can use for answering questions
 */
export function formatPDFForContext(data: PDFData): string {
  const { text, metadata } = data;
  const { pageCount, fileName } = metadata;

  return `
# Document: ${fileName}

**Pages**: ${pageCount}
**Extracted at**: ${metadata.uploadedAt?.toISOString() || new Date().toISOString()}

## Content

${text}

---
*End of document*
`.trim();
}

/**
 * Export validation function for testing
 */
export { validatePDFBuffer };
