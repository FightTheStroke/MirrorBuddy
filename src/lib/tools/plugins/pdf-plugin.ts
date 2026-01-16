/**
 * PDF Plugin
 * Tool plugin for PDF document upload and text extraction
 * Supports both Italian and English voice triggers for accessibility
 */

import { z } from 'zod';
import {
  ToolPlugin,
  ToolCategory,
  Permission,
  createSuccessResult,
  createErrorResult,
  ToolErrorCode,
} from '../plugin/types';
import type { ToolResult, PDFData, ToolContext } from '@/types/tools';
import { extractTextFromPDF } from '../handlers/study-kit-extraction';
import { logger } from '@/lib/logger';

/**
 * Zod schema for PDF input validation
 * Validates buffer (required) and optional metadata
 */
const PDFInputSchema = z.object({
  buffer: z.instanceof(Buffer).or(z.instanceof(Uint8Array)),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
});

/**
 * Validate PDF buffer for proper format
 */
function validatePDFBuffer(buffer: Buffer | Uint8Array): { valid: boolean; error?: string } {
  if (buffer.length === 0) {
    return { valid: false, error: 'PDF buffer is empty' };
  }

  const bufferSlice = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
  const header = bufferSlice.slice(0, 5).toString('latin1');
  if (header !== '%PDF-') {
    return { valid: false, error: 'Invalid PDF file - missing PDF header' };
  }

  return { valid: true };
}

/**
 * Handler for PDF upload
 * Extracts text from PDF and provides metadata for AI context
 */
async function pdfHandler(
  args: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> {
  try {
    const validated = PDFInputSchema.parse(args);
    const { buffer, fileName, fileSize } = validated;

    logger.debug('PDF handler invoked', { fileName, fileSize });

    // Validate PDF format
    const validation = validatePDFBuffer(buffer);
    if (!validation.valid) {
      logger.error('PDF validation failed', { error: validation.error, fileName });
      return createErrorResult(
        'upload_pdf',
        ToolErrorCode.VALIDATION_FAILED,
        validation.error || 'Invalid PDF file'
      );
    }

    // Convert to Buffer if needed
    const pdfBuffer = buffer instanceof Buffer ? buffer : Buffer.from(buffer);

    // Extract text using existing extraction logic
    const { text, pageCount } = await extractTextFromPDF(pdfBuffer);

    // Validate extracted text
    if (!text || text.trim().length === 0) {
      logger.warn('PDF extraction returned empty text', { fileName, pageCount });
      return createErrorResult(
        'upload_pdf',
        ToolErrorCode.EXECUTION_FAILED,
        'No text could be extracted from PDF - file may be empty or contain only images'
      );
    }

    logger.info('PDF text extraction successful', {
      fileName,
      pageCount,
      textLength: text.length,
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

    return createSuccessResult('upload_pdf', data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResult(
        'upload_pdf',
        ToolErrorCode.VALIDATION_FAILED,
        `Validation error: ${error.issues[0].message}`,
        { validationErrors: error.issues }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('PDF extraction failed', { error: errorMessage });

    return createErrorResult(
      'upload_pdf',
      ToolErrorCode.EXECUTION_FAILED,
      `Failed to extract text from PDF: ${errorMessage}`
    );
  }
}

/**
 * PDF Plugin Definition
 * Implements ToolPlugin interface for PDF document processing
 * Supports voice interaction with Italian and English triggers
 */
export const pdfPlugin: ToolPlugin = {
  // Identification
  id: 'upload_pdf',
  name: 'Carica PDF',

  // Organization
  category: ToolCategory.CREATION,

  // Validation
  schema: PDFInputSchema,

  // Execution
  handler: pdfHandler,

  // Voice interaction
  voicePrompt: {
    template: 'Vuoi caricare un PDF su {topic}?',
    requiresContext: ['topic'],
    fallback: 'Vuoi caricare un PDF?',
  },
  voiceFeedback: {
    template: 'Ho estratto il testo dal PDF: {pageCount} pagine!',
    requiresContext: ['pageCount'],
    fallback: 'Ho caricato il tuo PDF!',
  },
  voiceEnabled: true,

  // Voice triggers - Italian and English variations
  triggers: [
    'carica pdf',
    'upload pdf',
    'apri documento',
    'analizza pdf',
    'leggi pdf',
    'pdf',
    'documento',
    'load pdf',
  ],

  // Prerequisites
  prerequisites: [],

  // Permissions
  permissions: [Permission.FILE_ACCESS, Permission.READ_CONVERSATION, Permission.WRITE_CONTENT],
};

export default pdfPlugin;
